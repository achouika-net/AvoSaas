import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Law, LibraryMemo } from '@prisma/client';

export const suggestLegalContent = async (req: Request, res: Response) => {
  try {
    const { type, description, centerId } = req.body;
    
    // 1. Fetch Laws matching the category
    const lawsInCategory = await prisma.law.findMany({
      where: type ? { category: type } : {}
    });

    const searchTerms = (description || '').split(/\s+/).filter((s: string) => s.length > 3);
    
    // Rank laws by matching terms
    let rankedLaws = lawsInCategory.map((law: Law) => {
      let score = 0;
      searchTerms.forEach((term: string) => {
        if (law.keywords && law.keywords.includes(term)) score += 3; // High weight for keyword match
        if (law.content.includes(term)) score += 1;
        if (law.codeName.includes(term)) score += 1;
      });
      return { law, score };
    });

    // Sort by score descending and take top 5
    rankedLaws.sort((a, b) => b.score - a.score);
    const matchedLaws: Law[] = rankedLaws.filter(r => r.score > 0).slice(0, 5).map(r => r.law);
    // If no keyword matches, fallback to generic category laws
    if (matchedLaws.length === 0) {
      matchedLaws.push(...lawsInCategory.slice(0, 2));
    }

    // 2. Search Private Office Library (Isolation by centerId)
    let matchedMemos: LibraryMemo[] = [];
    let customApiKey: string | null = null;
    
    if (centerId) {
      const center = await prisma.center.findUnique({
        where: { id: String(centerId) },
        select: { geminiApiKey: true }
      });
      
      if (center && center.geminiApiKey) {
        customApiKey = center.geminiApiKey;
      }
      
      matchedMemos = await prisma.libraryMemo.findMany({
        where: { centerId: String(centerId) }
      });
      
      // Rank private memos
      let rankedMemos = matchedMemos.map((memo: LibraryMemo) => {
        let score = 0;
        if (memo.category === type) score += 2;
        searchTerms.forEach((term: string) => {
          if (memo.title.includes(term)) score += 3;
          if (memo.category?.includes(term)) score += 2;
          if (memo.content.includes(term)) score += 1;
        });
        return { memo, score };
      });
      
      rankedMemos.sort((a, b) => b.score - a.score);
      matchedMemos = rankedMemos.filter(r => r.score >= 1).slice(0, 3).map(r => r.memo);
    }

    let memo = '';
    let references = [
      ...matchedLaws.map((l: Law) => `${l.codeName} - الفصل/المادة ${l.articleNumber}`),
      ...matchedMemos.map((m: LibraryMemo) => `(من أرشيف المكتب) ${m.title}`)
    ];
    
    if (references.length === 0) {
      references = ['قانون المسطرة المدنية المغربي', 'قانون الالتزامات والعقود'];
    }

    const lawsText = matchedLaws.map((l: Law) => `\n◆ المادة/الفصل ${l.articleNumber} من ${l.codeName}:\n"${l.content}"`).join('\n');
    const privateMemosText = matchedMemos.map((m: LibraryMemo) => `\n★ سطر من مذكرة سابقة ناجحة (عن: ${m.title}):\n"${m.content.substring(0, 1000)}..."`).join('\n');

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (apiKey) {
      // 🚀 Real AI Synthesis using Gemini 🚀
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const systemInstruction = `
      أنت "مكتب آلي للمحاماة" خبير في القانون المغربي.
      **المهمة**: صياغة مسودة "مذكرة قانونية" احترافية جداً وخالية من الأخطاء بناءً على وقائع النزاع الحالية.
      
      **قواعد هامة جداً (مهم للغاية):**
      1. تم توفير "نصوص قانونية" و "مذكرات سابقة من أرشيف المكتب" لمساعدتك في استخراج التعليل القانوني والمطالب، **يمنع منعاً باتاً نسخ أسماء الموكلين القدامى، أو تواريخ الأحداث القديمة، أو تفاصيل المذكرات السابقة.**
      2. يجب أن تصيغ نصاً جديداً من الصفر يتحدث *فقط* عن "الوقائع الحالية" الخاصة بالموكل الجديد.
      3. قم باستخدام الدفوعات القانونية والاجتهادات الموجودة في مذكرات الأرشيف كإلهام قانوني فقط.
      4. اجعل النص مقسماً ومنظماً: (من الناحية الشكلية، من الناحية الموضوعية، ملتمسات).
      5. لا تضع أي شروحات موجهة لي، ابدأ فوراً بكتابة المذكرة القانونية.
      `;

      const prompt = `
      **الوقائع وتفاصيل القضية الحالية:**
      ${description}
      
      **نصوص قانونية مقترحة للاستناد عليها:**
      ${lawsText}
      
      **أجزاء من أرشيف مذكرات سابقة للقياس عليها (لا تنسخ أسماء أطرافها):**
      ${privateMemosText}
      
      يرجى صياغة المذكرة القانونية الآن بناءً على المعطيات أعلاه.
      `;

      try {
        console.log("Generating smart memo using Gemini 2.5 Flash...");
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemInstruction,
        });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2
            }
        });
        memo = result.response.text() || '';
      } catch (geminiError: any) {
        console.error("Gemini AI Error:", geminiError);
        memo = "حدث خطأ أثناء التواصل مع محرك الذكاء الاصطناعي. يرجى التأكد من صحة مفتاح API.";
      }
    } else {
      // ⚠️ Fallback Mock AI if no API key is provided ⚠️
      memo = `[تنبيه: لتشغيل "المحامي الآلي الحقيقي" واستبدال هذا النص المدمج بصياغة قانونية عصبية، يرجى إدخال مفتاح GEMINI_API_KEY في النظام]\n\n`;
      if (type === 'CIVIL') {
        memo += `الموضوع: مذكرة جوابية تفصيلية\nالملف عدد: [سيتم ملؤه تلقائياً]\n\nبناءً على الوقائع المسرودة:\n${description}\n\n${matchedLaws.length > 0 ? 'بالاستناد إلى المقتضيات القانونية التالية:' : ''}\n${lawsText}\n\n${matchedMemos.length > 0 ? 'بناءً على سوابق مماثلة من أرشيف المكتب:' : ''}\n${privateMemosText}\n\nحيث أن المدعي يدعي [..]، فإننا نرد بما يلي:\n1. من الناحية الشكلية: الدفع بعدم قبول الدعوى لخرق المقتضيات المذكورة أعلاه.\n2. من الناحية الموضوعية: غياب الإثبات القاطع بخصوص [..].\n\nوحيث أن القاعدة الفقهية تقول "البينة على من ادعى"،\nفإننا نلتمس من محكمتكم الموقرة الحكم برفض الطلب وتحميل المدعي الصائر.`;
      } else if (type === 'LABOUR') {
        memo += `الموضوع: مذكرة في إطار نزاع شغل (طرد تعسفي)\nالملف عدد: [..]\n\nبناءً على السردية الوافية:\n${description}\n\nتأسيساً على فصول قانون الشغل المغربي:\n${lawsText}\n\n${matchedMemos.length > 0 ? 'استناداً إلى نجاحات سابقة لمكتبكم في قضايا مشابهة:' : ''}\n${privateMemosText}\n\nحيث أن إنهاء عقد الشغل قد جاء خارج الضوابط القانونية المعمول بها،\nفإننا نؤكد على أحقية الموكل في التعويضات القانونية الكاملة (الإخطار، الطرد، والضرر).\n\nبناءً عليه نلتمس الحكم لصالح الموكل بكافة حقوقه.`;
      } else {
        memo += `مذكرة قانونية (توليفة قانونية موثقة)\n\nبناءً على الحيثيات المذكورة: ${description}\n\nالمقترح القانوني المستند للقوانين الحالية:\n${lawsText}\n\n${privateMemosText}\n\nاستناداً إلى نصوص القانون المغربي وسوابق المكتب، نقترح التوجه نحو التعليل القانوني بناء على النصوص أعلاه.`;
      }
    }

    res.json({
      title: 'مذكرة قانونية مصاغة آلياً (قاعدة البيانات القانونية)',
      content: memo,
      references: references,
      memo: memo,
      sources: matchedLaws,
      privateArchiveMatch: matchedMemos.length > 0
    });
  } catch (error: any) {
    console.error('Error in suggestLegalContent:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const { centerId } = req.params as { centerId: string };
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      select: { geminiApiKey: true, logo: true, headerTextAr: true, headerTextFr: true, footerTextAr: true, footerTextFr: true }
    });
    
    res.json({ 
      apiKey: center?.geminiApiKey || '', 
      logo: center?.logo || '',
      headerTextAr: center?.headerTextAr || '',
      headerTextFr: center?.headerTextFr || '',
      footerTextAr: center?.footerTextAr || '',
      footerTextFr: center?.footerTextFr || ''
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { centerId, apiKey, logo, headerTextAr, headerTextFr, footerTextAr, footerTextFr } = req.body;
    
    if (!centerId) return res.status(400).json({ error: 'Center ID required' });
    
    await prisma.center.upsert({
      where: { id: centerId },
      update: { 
        geminiApiKey: apiKey, 
        logo: logo, 
        headerTextAr: headerTextAr, 
        headerTextFr: headerTextFr,
        footerTextAr: footerTextAr,
        footerTextFr: footerTextFr
      },
      create: { 
        id: centerId, 
        name: 'Default Office', 
        geminiApiKey: apiKey, 
        logo: logo, 
        headerTextAr: headerTextAr, 
        headerTextFr: headerTextFr,
        footerTextAr: footerTextAr,
        footerTextFr: footerTextFr
      }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('updateSettings Detailed Error:', error);
    res.status(500).json({ error: error.message || 'Prisma Update Error' });
  }
};

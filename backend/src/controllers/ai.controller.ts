import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Law, LibraryMemo } from '@prisma/client';

export const suggestLegalContent = async (req: Request, res: Response) => {
  try {
    const { type, description, centerId } = req.body;
    
    // 1. Search local Law database for matching articles
    const searchTerms = (description || '').split(/\s+/).filter((s: string) => s.length > 3);
    
    // Search shared Law database
    const matchedLaws: Law[] = await prisma.law.findMany({
      where: {
        OR: [
          { category: type },
          ...searchTerms.map((term: string) => ({
            content: { contains: term, mode: 'insensitive' as const }
          })),
          ...searchTerms.map((term: string) => ({
            keywords: { contains: term, mode: 'insensitive' as const }
          }))
        ]
      },
      take: 3
    });

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
        where: {
          centerId: String(centerId),
          OR: [
            { category: type },
            ...searchTerms.map((term: string) => ({
              content: { contains: term, mode: 'insensitive' as const }
            }))
          ]
        },
        take: 3
      });
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
      select: { geminiApiKey: true }
    });
    
    res.json({ apiKey: center?.geminiApiKey || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { centerId, apiKey } = req.body;
    
    if (!centerId) return res.status(400).json({ error: 'Center ID required' });
    
    await prisma.center.update({
      where: { id: centerId },
      data: { geminiApiKey: apiKey }
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

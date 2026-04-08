import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.query;
    const filter = caseId ? { caseId: String(caseId) } : {};
    
    const documents = await prisma.document.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const { title, content, caseId, fileUrl, mimeType, type } = req.body;
    console.log(`[Backend] Creating document: Title="${title}", CaseId="${caseId}", Type="${type}", PayloadLength=${fileUrl?.length || 0}`);
    
    if (!caseId) {
      return res.status(400).json({ error: 'caseId is required' });
    }

    const document = await prisma.document.create({
      data: {
        title,
        content: content || '',
        fileUrl: fileUrl || null,
        mimeType: mimeType || null,
        type: type || 'TEXT',
        caseId
      }
    });
    res.status(201).json(document);
  } catch (error: any) {
    const errorLog = `\n--- ERROR AT ${new Date().toISOString()} ---\nTitle: ${req.body?.title}\nCaseId: ${req.body?.caseId}\nError: ${error.message}\nStack: ${error.stack}\n`;
    const logPath = path.join(process.cwd(), 'logs', 'document_error.log');
    
    try {
      if (!fs.existsSync(path.join(process.cwd(), 'logs'))) fs.mkdirSync(path.join(process.cwd(), 'logs'));
      fs.appendFileSync(logPath, errorLog);
    } catch (fsErr) {
      console.error('Failed to write to log file:', fsErr);
    }

    console.error('Create Document Error:', error.stack || error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message
    });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const document = await prisma.document.update({
      where: { id: String(id) },
      data: { title }
    });
    res.json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.document.delete({ where: { id: String(id) } });
    res.json({ message: 'Document removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const processOcrDocument = async (req: Request, res: Response) => {
  try {
    const { imageBase64, title, caseId, centerId } = req.body;
    
    if (!imageBase64 || !caseId) {
      return res.status(400).json({ error: 'Image and caseId are required' });
    }

    // 1. Get API Key
    let apiKey = process.env.GEMINI_API_KEY;
    if (centerId) {
       const center = await prisma.center.findUnique({ where: { id: String(centerId) }, select: { geminiApiKey: true }});
       if (center?.geminiApiKey) apiKey = center.geminiApiKey;
    }

    if (!apiKey) {
       return res.status(500).json({ error: 'GEMINI API KEY is missing. Cannot perform OCR.' });
    }

    // 2. Initialize Gemini Vision
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Ensure base64 string doesn't have the data URL prefix if sent fully raw
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mimeType = imageBase64.includes(',') ? imageBase64.split(';')[0].split(':')[1] : 'image/jpeg';

    const prompt = "استخرج النص من هذا المستند القانوني بدقة عالية جداً. حافظ على نفس الفقرات وتنسيق العناوين. لا تضف أي تعليق من عندك، أعد النص كما هو مكتوب فقط لكي أقوم بحفظه بصيغة Word.";
    
    console.log("Processing OCR on image chunk...");
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType } }
    ]);

    const extractedText = result.response.text();

    // 3. Save as Document
    const document = await prisma.document.create({
      data: {
        title: title || 'مستند ممسوح ضوئياً',
        content: extractedText,
        fileUrl: imageBase64, // Keep the original scan as evidence
        mimeType: mimeType,
        type: 'TEXT',
        caseId
      }
    });

    res.status(201).json(document);
  } catch (error: any) {
    console.error('OCR Processing Error:', error);
    res.status(500).json({ error: error.message });
  }
};

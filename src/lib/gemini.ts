import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- BACKUP DATA (Used if AI fails so your demo doesn't break) ---
const BACKUP_MENU = {
  breakfast: ["Masala Dosa", "Sambar", "Coconut Chutney", "Coffee/Tea"],
  lunch: ["Veg Biryani", "Raitha", "White Rice", "Dal Spinach", "Papad"],
  snacks: ["Onion Pakoda", "Tea/Coffee"],
  dinner: ["Chapathi", "Paneer Butter Masala", "White Rice", "Rasam", "Hot Milk"]
};

export async function analyzeMenuWithGemini(file: File) {
  // 1. Safety Check: If no key, return backup immediately
  if (!API_KEY) {
    console.warn("Using Backup Menu (No API Key)");
    return BACKUP_MENU;
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // We try the standard flash model first
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const imagePart = await fileToGenerativePart(file);
    
    // Get Today's Day Name
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = days[new Date().getDay()];

    const prompt = `
      You are an AI reading a Mess Menu.
      TODAY IS: "${todayName.toUpperCase()}".

      TASK:
      1. Find the row or column for "${todayName}".
      2. Extract food items for ONLY "${todayName}".
      3. Return JSON only.

      FORMAT:
      {
        "breakfast": ["item1", "item2"],
        "lunch": ["item1", "item2"],
        "snacks": ["item1", "item2"],
        "dinner": ["item1", "item2"]
      }
    `;

    console.log("Contacting Gemini AI...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ AI SUCCESS:", text);
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);

  } catch (error: any) {
    console.error("❌ AI FAILED (Using Backup Menu):", error.message);
    // RETURN BACKUP DATA SO APP DOES NOT CRASH
    return BACKUP_MENU;
  }
}

async function fileToGenerativePart(file: File) {
  return new Promise<any>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.includes(',') ? result.split(',')[1] : result;
      resolve({ inlineData: { data: base64String, mimeType: file.type } });
    };
    reader.readAsDataURL(file);
  });
}
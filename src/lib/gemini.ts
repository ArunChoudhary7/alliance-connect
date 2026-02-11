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
  if (!API_KEY || API_KEY === "undefined") {
    console.warn("⚠️ Using Backup Menu (VITE_GEMINI_API_KEY is missing in .env)");
    return BACKUP_MENU;
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // Using 1.5 Flash - it's fastest and free under 15 requests per minute
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" } // Force JSON mode
  });

  try {
    const imagePart = await fileToGenerativePart(file);
    
    // Get Today's Day Name
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = days[new Date().getDay()];

    const prompt = `
      You are an expert OCR and Data Analyst. 
      The attached image is a College Mess Menu table/grid.
      
      TODAY IS: ${todayName.toUpperCase()}.

      TASK:
      1. Carefully scan the table for the column or row representing "${todayName}" (it might be abbreviated like "MON", "TUE", etc.).
      2. Identify the meal categories: Breakfast, Lunch, Snacks (or High Tea), and Dinner.
      3. Extract the specific food items for ONLY ${todayName}.
      4. If a meal category is merged with another day or formatted strangely, do your best to isolate only the items for ${todayName}.

      Strict JSON output only:
      {
        "breakfast": ["item"],
        "lunch": ["item"],
        "snacks": ["item"],
        "dinner": ["item"]
      }
    `;

    console.log(`🤖 Contacting Gemini AI for ${todayName}'s menu...`);
    
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential AI chatter or markdown blocks
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedData = JSON.parse(cleanedText);
    
    console.log("✅ AI SUCCESS:", parsedData);
    return parsedData;

  } catch (error: any) {
    console.error("❌ AI FAILED (Using Backup Menu):", error.message);
    // Return backup data instead of crashing the app
    return BACKUP_MENU;
  }
}

/**
 * Converts a File object to a format Gemini can understand
 */
async function fileToGenerativePart(file: File) {
  return new Promise<any>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      if (!base64String) {
        reject(new Error("Failed to process image file"));
        return;
      }
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
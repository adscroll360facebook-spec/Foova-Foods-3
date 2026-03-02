import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Enhanced fetch that always tries to return JSON but handles non-OK 
 * or non-JSON responses gracefully (e.g. Render/Vercel error HTML).
 * Includes retry logic to handle Render free tier cold starts.
 */
export async function safeFetch(endpoint: string, options: RequestInit = {}, retries = 2) {
  // Ensure absolute URL if base URL is provided, else relative
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  // Automatically attach auth token
  const token = localStorage.getItem("foova_token");
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const finalOptions = { ...options, headers };

  try {
    const response = await fetch(url, finalOptions);
    const contentType = response.headers.get("content-type");

    // Check if response is JSON
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || `Error ${response.status}: ${response.statusText}`);
      }
      return data;
    } else {
      // It's text or HTML (often a server error page)
      const text = await response.text();
      if (!response.ok) {
        // If it's a 404 or other error and we have retries left, try again
        // This helps if the server is just waking up
        if (retries > 0) {
          console.log(`Retrying fetch for ${endpoint}... (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s
          return safeFetch(endpoint, options, retries - 1);
        }
        
        // Strip HTML tags if we got a massive error page
        const cleanMessage = text.length > 200 ? `Server Error (${response.status})` : text;
        throw new Error(cleanMessage);
      }
      return text;
    }
  } catch (err: any) {
    if (retries > 0) {
      console.log(`Retrying fetch for ${endpoint} due to error:`, err.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return safeFetch(endpoint, options, retries - 1);
    }
    console.error(`Fetch API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

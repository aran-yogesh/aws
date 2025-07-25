import streamlit as st
from PIL import Image
import pytesseract
import io
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
HF_API_KEY = os.getenv("HF_API_KEY")
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"

st.set_page_config(page_title="AI Copilot for Senior Citizens", layout="centered")
st.title("AI Copilot for Senior Citizens")
st.write("""
Welcome! Enter your instructions or upload a medical document. We'll extract the main information for you.
""")

# Text input area
user_input = st.text_area("Enter your instructions or questions:", "", height=120)

# File uploader
uploaded_file = st.file_uploader("Or upload a medical document (image, PDF coming soon):", type=["png", "jpg", "jpeg"])

extracted_text = ""

# OCR extraction for uploaded images
if uploaded_file is not None:
    try:
        image = Image.open(uploaded_file)
        extracted_text = pytesseract.image_to_string(image)
        st.success("Document processed successfully!")
        st.text_area("Extracted text:", extracted_text, height=200)
    except Exception as e:
        st.error(f"Error processing document: {str(e)}")

# AI extraction function
def extract_medical_info(text):
    if not HF_API_KEY:
        return "Error: Hugging Face API key not found. Please check your .env file."
    
    if not text.strip():
        return "Please provide some text to analyze."
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""Extract the main medical information from the following text and format it as JSON with these fields: name, age, diagnosis, medications, allergies, notes. If any field is not found, use null.

Text: {text}

Response (JSON only):"""
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.1
        }
    }
    
    try:
        response = requests.post(HF_API_URL, headers=headers, json=payload)
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                return result[0].get('generated_text', 'No response generated')
            else:
                return str(result)
        else:
            return f"Error calling Hugging Face API: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error calling Hugging Face API: {str(e)}"

# Extract button
if st.button("Extract Medical Information with AI"):
    if user_input or extracted_text:
        text_to_analyze = user_input if user_input else extracted_text
        with st.spinner("Analyzing with AI..."):
            result = extract_medical_info(text_to_analyze)
        st.subheader("AI Analysis Result:")
        st.text_area("Extracted Information:", result, height=300)
    else:
        st.warning("Please enter some text or upload a document first.") 
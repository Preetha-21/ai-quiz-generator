import os
import json
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_quiz(topic, difficulty, number_of_questions):

    prompt = f"""
Generate {number_of_questions} multiple choice questions on {topic}.

Difficulty: {difficulty}

Return ONLY valid JSON in this exact format:

{{
  "questions":[
    {{
      "question":"...",
      "option_a":"...",
      "option_b":"...",
      "option_c":"...",
      "option_d":"...",
      "correct_answer":"option_a",
      "explanation":"..."
    }}
  ]
}}
"""

    response = model.generate_content(prompt)

    text = response.text.strip()

    # Remove Markdown code fences if Gemini returns them
    text = text.replace("```json", "").replace("```", "").strip()

    return json.loads(text)
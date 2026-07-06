import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def generate_quiz(topic, difficulty, number_of_questions):

    try:

        prompt = f"""
You are an expert Java quiz generator.

Generate exactly {number_of_questions} multiple choice questions.

Topic: {topic}
Difficulty: {difficulty}

Rules:
1. Return ONLY valid JSON.
2. No markdown.
3. No ```json.
4. Questions must be real interview/exam style.
5. Options must be meaningful.
6. Explanation must be short.

Format:

{{
  "questions":[
    {{
      "question":"",
      "option_a":"",
      "option_b":"",
      "option_c":"",
      "option_d":"",
      "correct_answer":"option_a",
      "explanation":""
    }}
  ]
}}
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text.strip()

        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

        return json.loads(text)

    except Exception as e:

        print("Gemini Error:", e)
        print("Using fallback questions...")

        questions = []

        for i in range(int(number_of_questions)):

            questions.append({
                "question": f"{difficulty.title()} {topic} Question {i+1}",
                "option_a": f"{topic} Option A",
                "option_b": f"{topic} Option B",
                "option_c": f"{topic} Option C",
                "option_d": f"{topic} Option D",
                "correct_answer": "option_a",
                "explanation": "Fallback question because Gemini quota has been exceeded."
            })

        return {
            "questions": questions
        }
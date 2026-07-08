import os
import google.generativeai as genai

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_quiz(topic, difficulty, number_of_questions):

    prompt = f"""
    Generate {number_of_questions} multiple choice questions.

    Topic: {topic}
    Difficulty: {difficulty}

    Return only valid JSON in this format:

    {{
      "questions": [
        {{
          "question": "",
          "options": ["", "", "", ""],
          "answer": ""
        }}
      ]
    }}
    """

    response = model.generate_content(prompt)

    return response.text
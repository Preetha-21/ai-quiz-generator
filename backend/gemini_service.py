import os
import google.generativeai as genai


genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)


def generate_quiz(topic, difficulty, number_of_questions):

    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
    Generate {number_of_questions} multiple choice questions.

    Topic: {topic}
    Difficulty: {difficulty}

    Return only JSON format:
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
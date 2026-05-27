import os
import requests
import json
import logging

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self):
        # Default to host.docker.internal if in Docker, otherwise localhost
        self.base_url = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        self.model = os.environ.get("OLLAMA_MODEL", "llama3")

    def chat(self, messages):
        """
        Send a list of messages to Ollama chat API.
        messages: [{"role": "user", "content": "hello"}]
        """
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }
        
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            return result.get("message", {}).get("content", "Désolé, je n'ai pas pu générer de réponse.")
        except Exception as e:
            logger.error(f"Ollama Error: {str(e)}")
            return f"Erreur de connexion à Ollama ({self.model}). Assurez-vous qu'Ollama est lancé sur {self.base_url}."

    def ask_general(self, question, context=""):
        """Simple helper for general questions."""
        system_prompt = "Tu es l'assistant IA officiel de la plateforme InsureTM. Tu es expert en QA, tests logiciels et assurance. Réponds de manière concise et professionnelle en Français."
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if context:
            messages.append({"role": "system", "content": f"Contexte actuel : {context}"})
        
        messages.append({"role": "user", "content": question})
        return self.chat(messages)

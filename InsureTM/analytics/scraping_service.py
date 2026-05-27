import requests
from bs4 import BeautifulSoup
from .models import QANews
import os
from groq import Groq

class QAScrapingService:
    def __init__(self):
        self.url = "https://www.ministryoftesting.com/articles" # On peut aussi utiliser leur feed
        self.client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

    def scrape_and_update(self):
        """Scrapes the latest QA articles and generates AI tips."""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        try:
            response = requests.get(self.url, headers=headers, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Cibler les liens d'articles plus largement
            links = soup.find_all('a', href=True)
            
            new_items = 0
            count = 0
            for link_tag in links:
                if count >= 5: break
                
                href = link_tag['href']
                # Filtrer pour ne garder que les articles
                if '/articles/' in href and len(link_tag.text.strip()) > 20:
                    title = link_tag.text.strip()
                    full_url = href
                    if not full_url.startswith('http'):
                        full_url = "https://www.ministryoftesting.com" + href
                    
                    if not QANews.objects.filter(url=full_url).exists():
                        ai_tip = self._generate_ai_tip(title)
                        QANews.objects.create(
                            title=title,
                            url=full_url,
                            content_summary=f"Veille QA sur {title}",
                            ai_tip=ai_tip
                        )
                        new_items += 1
                        count += 1
            
            return new_items

        except Exception as e:
            print(f"Erreur Scraping: {str(e)}")
            return 0

    def _generate_ai_tip(self, title):
        """Uses Groq to turn a technical title into a practical QA tip."""
        api_key = os.environ.get('GROQ_API_KEY')
        if not api_key:
            print("⚠️ GROQ_API_KEY manquante dans l'environnement")
            return f"💡 Tip : Pour '{title}', assurez-vous de tester les cas limites (edge cases) en priorité."

        try:
            # Re-initialiser le client pour être sûr d'avoir la clé à jour
            client = Groq(api_key=api_key)
            
            prompt = f"""
            Tu es un expert QA senior. Voici un titre d'article technique : '{title}'
            Donne UN SEUL conseil pratique, concret et expert (max 150 caractères) pour un testeur. 
            Sois très spécifique au sujet.
            Ne commence PAS par 'Tip:' ou 'Conseil:'.
            Réponds en français.
            """
            
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile", # Modèle à jour et performant
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
                max_tokens=80
            )
            tip = completion.choices[0].message.content.strip()
            # Nettoyage si l'IA en rajoute trop
            tip = tip.replace('"', '').replace('Tip :', '').replace('Conseil :', '')
            return f"💡 {tip}"
        except Exception as e:
            print(f"❌ Erreur Groq dans le service de scraping: {str(e)}")
            return f"💡 Pour optimiser '{title}', automatisez les tests de régression les plus critiques."


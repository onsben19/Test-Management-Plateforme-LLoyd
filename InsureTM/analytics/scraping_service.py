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
        """Scrapes the latest QA articles from multiple sources and generates AI tips."""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        sources = [
            {
                "name": "Ministry of Testing",
                "url": "https://www.ministryoftesting.com/articles",
                "base": "https://www.ministryoftesting.com",
                "is_article": lambda href: '/articles/' in href and len(href) > 20
            },
            {
                "name": "Testim",
                "url": "https://www.testim.io/blog/",
                "base": "https://www.testim.io",
                "is_article": lambda href: '/blog/' in href and len(href.split('/')) > 4
            },
            {
                "name": "Applitools",
                "url": "https://applitools.com/blog/",
                "base": "https://applitools.com",
                "is_article": lambda href: '/blog/' in href and len(href) > 30
            }
        ]
        
        new_items = 0
        
        for source in sources:
            try:
                response = requests.get(source['url'], headers=headers, timeout=15)
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.find_all('a', href=True)
                
                count = 0
                for link_tag in links:
                    if count >= 3: break # 3 articles per source
                    
                    href = link_tag['href']
                    title = " ".join(link_tag.text.split())[:250]
                    
                    if source['is_article'](href) and len(title) > 20:
                        full_url = href if href.startswith('http') else source['base'] + href
                        
                        if not QANews.objects.filter(url=full_url).exists():
                            ai_tip = self._generate_ai_tip(title)
                            QANews.objects.create(
                                title=title,
                                url=full_url,
                                source=source['name'],
                                content_summary=f"Veille QA sur {title}",
                                ai_tip=ai_tip
                            )
                            new_items += 1
                            count += 1
            except Exception as e:
                print(f"Erreur Scraping sur {source['name']}: {str(e)}")
                
        return new_items

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


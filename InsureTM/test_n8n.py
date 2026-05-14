import requests

# Les données complètes pour tester le workflow n8n
data = {
    "campaign_id": 45,
    "campaign_title": "Audit Qualité Algorithme ML",
    "delay_days": 197,
    "manager_email": "manager.test@example.com",
    "tester_distribution": [
        {
            "tester_id": 10,
            "tester_name": "Israa B.",
            "email": "benmessaoudons@outlook.com",
            "ml_score": 50
        },
        {
            "tester_id": 11,
            "tester_name": "Bob Tester",
            "email": "benmessaoudons@outlook.com",
            "ml_score": 24
        }
    ]
}

# OPTION A : URL de TEST (Nécessite de cliquer sur 'Listen for test event' à chaque fois)
# url = "http://localhost:5678/webhook-test/catchup-plan/"

# OPTION B : URL de PRODUCTION (Recommandé)
# Pour l'utiliser : Activez le workflow en haut à droite dans n8n (toggle 'Active')
url = "http://localhost:5678/webhook/catchup-plan/"

print("Envoi des données à n8n...")
try:
    response = requests.post(url, json=data, timeout=5)
    print(f"Code de statut : {response.status_code}")
    if response.status_code == 200:
        print("Succès ! Le workflow a été déclenché.")
    elif response.status_code == 404:
        print("Erreur 404. Si vous utilisez l'URL de production, vérifiez que le workflow est bien ACTIF (bouton en haut à droite).")
        print("Si vous utilisez l'URL de test, vérifiez que vous avez cliqué sur 'Listen for test event'.")
    else:
        print(f"Autre statut : {response.status_code}")
except Exception as e:
    print(f"Erreur lors de l'appel : {e}")

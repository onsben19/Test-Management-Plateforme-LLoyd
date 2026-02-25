import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import os

# 1. Génération de données synthétiques pour la démonstration
def generate_data(n_samples=1000):
    np.random.seed(42)
    # Features :
    # - total_cases : Nombre total de tests
    # - finished_cases : Tests déjà faits
    # - days_elapsed : Jours depuis le début
    # - velocity : finished_cases / days_elapsed
    
    total_cases = np.random.randint(50, 500, n_samples)
    finished_cases = np.random.randint(5, 45, n_samples)
    days_elapsed = np.random.randint(1, 15, n_samples)
    velocity = finished_cases / days_elapsed
    
    # Target : days_remaining (ce que le modèle doit prédire)
    # Formule théorique : (total_cases - finished_cases) / velocity
    # On ajoute un peu de "bruit" pour simuler l'imprévisibilité humaine (complexité, bugs, etc.)
    noise = np.random.normal(0, 1.5, n_samples)
    days_remaining = (total_cases - finished_cases) / (velocity + 0.1) + noise
    days_remaining = np.maximum(0, days_remaining) # Pas de jours négatifs
    
    df = pd.DataFrame({
        'total_cases': total_cases,
        'finished_cases': finished_cases,
        'days_elapsed': days_elapsed,
        'velocity': velocity,
        'days_remaining': days_remaining
    })
    return df

# 2. Entraînement
def train():
    print("Génération des données...")
    df = generate_data()
    
    X = df[['total_cases', 'finished_cases', 'days_elapsed', 'velocity']]
    y = df['days_remaining']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Entraînement du modèle RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Précision du modèle (R²) : {score:.4f}")
    
    # Sauvegarde
    model_path = 'research/timeline_model.joblib'
    joblib.dump(model, model_path)
    print(f"Modèle sauvegardé dans : {model_path}")

if __name__ == "__main__":
    train()

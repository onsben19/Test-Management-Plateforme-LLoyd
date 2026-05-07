const fs = require('fs');

const addKeys = (lang, content) => {
    const file = `./project/src/locales/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.historicalAnalytics = content;
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
};

addKeys('en', {
    "title": "Historical Analytics",
    "titleAll": "Platform Analytics",
    "subtitle": "Trends on {{count}} releases",
    "subtitleAll": "Consolidation of all active projects",
    "liveAggregation": "Live Aggregation",
    "tabs": {
        "quality": "Quality",
        "velocity": "Performance",
        "strat": "Strategy"
    },
    "qualityTab": {
        "title": "Releases Quality Comparison",
        "table": "Table",
        "chart": "Chart",
        "release": "Release",
        "successRate": "Success Rate",
        "anomalies": "Anomalies",
        "status": "Quality Status",
        "empty": "No release found for this project.",
        "emptyChart": "No graphical data available",
        "trajectory": "Historical Quality Trajectory",
        "reported": "reported",
        "reportedPlural": "reported",
        "stable": "Stable",
        "atRisk": "At Risk",
        "critical": "Critical",
        "globalAverage": "Global Average",
        "totalReleases": "Total: {{count}} Releases",
        "trend": "Trend"
    }
});

addKeys('fr', {
    "title": "Analytics Historiques",
    "titleAll": "Analytics Plateforme",
    "subtitle": "Tendances sur {{count}} releases",
    "subtitleAll": "Consolidation de tous les projets actifs",
    "liveAggregation": "Live Aggregation",
    "tabs": {
        "quality": "Qualité",
        "velocity": "Performance",
        "strat": "Stratégie"
    },
    "qualityTab": {
        "title": "Comparatif Qualité des Releases",
        "table": "Tableau",
        "chart": "Graphique",
        "release": "Release",
        "successRate": "Taux de Succès",
        "anomalies": "Anomalies",
        "status": "Statut Qualité",
        "empty": "Aucune release trouvée pour ce projet.",
        "emptyChart": "Aucune donnée graphique disponible",
        "trajectory": "Trajectoire de Qualité Historique",
        "reported": "signalée",
        "reportedPlural": "signalées",
        "stable": "Stable",
        "atRisk": "À risque",
        "critical": "Critique",
        "globalAverage": "Moyenne Globale",
        "totalReleases": "Total : {{count}} Releases",
        "trend": "Tendance"
    }
});

console.log("Translations added.");

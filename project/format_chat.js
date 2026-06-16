const fs = require('fs');

const formatShortDate = `
    const formatShortDate = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '...';
        let formatted = formatDistanceToNow(date, { locale: fr });
        return formatted
            .replace('environ ', '')
            .replace(' jours', 'j')
            .replace(' jour', 'j')
            .replace(' heures', 'h')
            .replace(' heure', 'h')
            .replace(' minutes', 'm')
            .replace(' minute', 'm');
    };
`;

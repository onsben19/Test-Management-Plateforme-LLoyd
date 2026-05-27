import React from 'react';
import PageLayout from '../components/PageLayout';
import QANewsHub from '../components/QANewsHub';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QANewsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <PageLayout>


            <div className="space-y-12">
                {/* The main Hub component */}
                <QANewsHub />
            </div>
        </PageLayout>
    );
};

export default QANewsPage;

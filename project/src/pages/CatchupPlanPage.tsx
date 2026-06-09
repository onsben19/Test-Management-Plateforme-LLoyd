import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import CatchupPlanIA from '../components/CatchupPlanIA';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

const CatchupPlanPage: React.FC = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();

    if (!campaignId) return null;

    return (
        <PageLayout
            title="Optimisation IA"
            subtitle="Plan de rattrapage"
            actions={
                <Button 
                    variant="secondary" 
                    icon={ArrowLeft} 
                    onClick={() => navigate(-1)}
                >
                    Retour aux campagnes
                </Button>
            }
        >
            <div className="max-w-6xl mx-auto pt-8">
                <CatchupPlanIA 
                    campaignId={campaignId} 
                    onPlanApplied={() => {
                        // Optionally refresh or show message, toast is already shown inside
                    }}
                />
            </div>
        </PageLayout>
    );
};

export default CatchupPlanPage;

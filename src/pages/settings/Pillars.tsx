import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { PILLARS } from '@/lib/constants';
import { Check, Edit3, Save, X, GraduationCap, Heart, Shield, Users, TrendingUp, LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const iconMap: Record<string, LucideIcon> = {
  GraduationCap,
  Heart,
  Shield,
  Users,
  TrendingUp,
};

interface PillarCustomizations {
  displayName: string; // shortName
  categoryName: string; // name
  description: string;
}

interface EditingState {
  pillarId: string;
  field: keyof PillarCustomizations;
}

export default function Pillars() {
  const { t } = useLanguage();
  const [pillarCustomizations, setPillarCustomizations] = useState<Record<string, PillarCustomizations>>({});
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const lastSavedValueRef = useRef('');

  const getTranslatedPillarShortName = (pillarId: string) => {
    switch (pillarId) {
      case 'education_skills':
        return t('pillars.educationShort');
      case 'culture_ethics':
        return t('pillars.cultureShort');
      case 'responsibility_reliability':
        return t('pillars.responsibilityShort');
      case 'environment_community':
        return t('pillars.communityShort');
      case 'economy_contribution':
        return t('pillars.economyShort');
      default:
        return pillarId;
    }
  };

  const getTranslatedPillarName = (pillarId: string) => {
    switch (pillarId) {
      case 'education_skills':
        return t('pillars.educationName');
      case 'culture_ethics':
        return t('pillars.cultureName');
      case 'responsibility_reliability':
        return t('pillars.responsibilityName');
      case 'environment_community':
        return t('pillars.communityName');
      case 'economy_contribution':
        return t('pillars.economyName');
      default:
        return pillarId;
    }
  };

  const getTranslatedPillarDescription = (pillarId: string) => {
    switch (pillarId) {
      case 'education_skills':
        return t('pillars.educationDescription');
      case 'culture_ethics':
        return t('pillars.cultureDescription');
      case 'responsibility_reliability':
        return t('pillars.responsibilityDescription');
      case 'environment_community':
        return t('pillars.communityDescription');
      case 'economy_contribution':
        return t('pillars.economyDescription');
      default:
        return '';
    }
  };

  const getDefaultCustomizations = () => {
    const defaults: Record<string, PillarCustomizations> = {};
    PILLARS.forEach(pillar => {
      defaults[pillar.id] = {
        displayName: getTranslatedPillarShortName(pillar.id),
        categoryName: getTranslatedPillarName(pillar.id),
        description: getTranslatedPillarDescription(pillar.id),
      };
    });
    return defaults;
  };
  useEffect(() => {
    // Load custom pillar customizations from localStorage
    const saved = localStorage.getItem('customPillarCustomizations');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPillarCustomizations(parsed);
      lastSavedValueRef.current = JSON.stringify(parsed);
    } else {
      // Check for old format and migrate
      const oldSaved = localStorage.getItem('customPillarNames');
      if (oldSaved) {
        const oldNames = JSON.parse(oldSaved);
        const migrated: Record<string, PillarCustomizations> = {};
        PILLARS.forEach(pillar => {
          migrated[pillar.id] = {
            displayName: getTranslatedPillarShortName(pillar.id),
            categoryName: oldNames[pillar.id] || getTranslatedPillarName(pillar.id),
            description: getTranslatedPillarDescription(pillar.id),
          };
        });
        setPillarCustomizations(migrated);
        localStorage.setItem('customPillarCustomizations', JSON.stringify(migrated));
        localStorage.removeItem('customPillarNames'); // Clean up old key
        lastSavedValueRef.current = JSON.stringify(migrated);
      } else {
        const defaults = getDefaultCustomizations();
        setPillarCustomizations(defaults);
        lastSavedValueRef.current = JSON.stringify(defaults);
      }
    }
    hydratedRef.current = true;
  }, [t]);

  const handleStartEdit = (pillarId: string, field: keyof PillarCustomizations, currentValue: string) => {
    setEditing({ pillarId, field });
    setTempValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    
    setAutoSaveError(null);
    setPillarCustomizations(prev => ({
      ...prev,
      [editing.pillarId]: {
        ...prev[editing.pillarId],
        [editing.field]: tempValue
      }
    }));
    
    setEditing(null);
    setTempValue('');
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setTempValue('');
  };

  const persistCustomizations = async (nextCustomizations: Record<string, PillarCustomizations>, showSuccessToast = false) => {
    setSaving(true);

    try {
      const serialized = JSON.stringify(nextCustomizations);
      localStorage.setItem('customPillarCustomizations', serialized);
      lastSavedValueRef.current = serialized;
      setAutoSaveError(null);

      if (showSuccessToast) {
        toast.success(t('pillars.saved'));
      }

      return true;
    } catch (error) {
      console.error('Error saving pillar customizations:', error);
      setAutoSaveError(t('pillars.autoSaveFailed'));
      toast.error(t('pillars.autoSaveFailed'));
      return false;
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!hydratedRef.current) return;

    const serialized = JSON.stringify(pillarCustomizations);
    if (!serialized || serialized === lastSavedValueRef.current) return;

    const timer = window.setTimeout(() => {
      void persistCustomizations(pillarCustomizations);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [pillarCustomizations]);

  const handleRetrySave = async () => {
    await persistCustomizations(pillarCustomizations, true);
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AppPageHeader
            title={t('pillars.title')}
            subtitle={t('pillars.description')}
            fallbackPath="/settings"
            actions={
              autoSaveError ? (
                <Button
                  onClick={handleRetrySave}
                  disabled={saving}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t('pillars.retrySave')}
                </Button>
              ) : (
                <p className="text-right text-sm text-muted-foreground">
                  {saving ? t('pillars.autoSaving') : t('pillars.autoSaveActive')}
                </p>
              )
            }
          />
        </motion.div>

        {/* Pillars Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {PILLARS.map((pillar, index) => {
            const custom = pillarCustomizations[pillar.id] || {
              displayName: getTranslatedPillarShortName(pillar.id),
              categoryName: getTranslatedPillarName(pillar.id),
              description: getTranslatedPillarDescription(pillar.id),
            };
            
            const isEditingDisplayName = editing?.pillarId === pillar.id && editing?.field === 'displayName';
            const isEditingCategoryName = editing?.pillarId === pillar.id && editing?.field === 'categoryName';
            const isEditingDescription = editing?.pillarId === pillar.id && editing?.field === 'description';

            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card className="p-3 h-full">
                  <div className="space-y-2">
                    {/* Pillar Header */}
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${pillar.bgColorClass} flex items-center justify-center shrink-0`}>
                        {(() => {
                          const Icon = iconMap[pillar.icon];
                          return Icon ? <Icon className="w-4 h-4 text-white" /> : null;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditingDisplayName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              className="text-sm h-8 font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                            onClick={() => handleStartEdit(pillar.id, 'displayName', custom.displayName)}
                          >
                            <p className="text-sm font-medium">{custom.displayName}</p>
                            <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Category Name */}
                    <div>
                      {isEditingCategoryName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="text-sm h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                          onClick={() => handleStartEdit(pillar.id, 'categoryName', custom.categoryName)}
                        >
                          <span className="text-sm">{custom.categoryName}</span>
                          <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      {isEditingDescription ? (
                        <div className="space-y-2">
                          <Textarea
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="text-sm min-h-[60px] resize-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 px-2">
                              <Check className="w-3 h-3 mr-1" />
                              {t('pillars.done')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 px-2">
                              <X className="w-3 h-3 mr-1" />
                              {t('pillars.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                          onClick={() => handleStartEdit(pillar.id, 'description', custom.description)}
                          title={custom.description}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs text-muted-foreground leading-relaxed">
                              {truncateText(custom.description, 80)}
                            </span>
                            <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2 mt-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </AppLayout>
  );
}

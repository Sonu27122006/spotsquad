import React from 'react';
import { Bike, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function StatusBadge({ status, type = 'vehicle' }) {
  const { t } = useLanguage();

  if (type === 'payment') {
    if (status === 'PAID') {
      return (
        <span className="badge badge-paid">
          <CheckCircle2 size={12} /> {t('badgePaid')}
        </span>
      );
    }
    return (
      <span className="badge badge-pending">
        <Clock size={12} /> {t('badgePending')}
      </span>
    );
  }

  // Vehicle Status
  if (status === 'PARKED') {
    return (
      <span className="badge badge-parked">
        <Bike size={12} /> {t('badgeParked')}
      </span>
    );
  } else if (status === 'EXITED') {
    return (
      <span className="badge badge-exited">
        <CheckCircle2 size={12} /> {t('badgeExited')}
      </span>
    );
  }

  return <span className="badge badge-exited">{status}</span>;
}

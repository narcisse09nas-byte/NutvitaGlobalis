
'use client';

import { Child, HealthArea, Village } from '@/nutritrack/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/nutritrack/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/nutritrack/components/ui/avatar';
import QRCode from "react-qr-code";
import { format } from 'date-fns';
import { Timestamp } from '@/nutritrack/local-firestore';
import { Logo } from './logo';
import React from 'react';

interface ChildIdentityCardProps {
  child: Child;
  healthArea: HealthArea;
  village: Village;
}

const ChildPlaceholderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);


export const ChildIdentityCard = React.forwardRef<HTMLDivElement, ChildIdentityCardProps>(
  ({ child, healthArea, village }, ref) => {

    const formatDate = (dateValue: any) => {
      if (!dateValue) return 'N/A';
      if (dateValue instanceof Timestamp) {
        return format(dateValue.toDate(), 'PPP');
      }
      if (typeof dateValue === 'string' || typeof dateValue === 'number' || dateValue instanceof Date) {
          try {
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                  return format(date, 'PPP');
              }
          } catch (e) {
              return 'Invalid Date';
          }
      }
      return 'Invalid Date';
    }

    const cardUrl = typeof window !== 'undefined' ? `${window.location.origin}/children/${child.id}` : '';

    return (
      <div ref={ref} className="w-[3.370in] h-[2.125in] p-2 border-2 border-black rounded-lg bg-white text-black flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-start justify-between pb-1 border-b-2 border-black">
           <div className='flex flex-col'>
              <Logo />
              <p className='text-[8px] font-bold leading-tight mt-1'>Community-based management of acute malnutrition Program</p>
           </div>
          <div className="text-right">
            <p className="text-xs font-bold whitespace-nowrap">{healthArea.healthFacilityName}</p>
            <p className="text-[10px] whitespace-nowrap">{healthArea.healthDistrict}, {healthArea.region}, {healthArea.country}</p>
          </div>
        </div>
        {/* Body */}
        <div className="flex-grow flex pt-2 gap-2">
          {/* Left Side: Info */}
          <div className="flex-grow space-y-1">
              <p className="font-bold text-sm leading-tight">{child.firstName} {child.lastName}</p>
              <div className="text-[10px] leading-snug">
                  <p><span className="font-semibold">ID:</span> {child.childCode}</p>
                  <p><span className="font-semibold">Caretaker Phone:</span> {child.caretakerPhone}</p>
                  <p><span className="font-semibold">Sex:</span> {child.sex === 'M' ? 'Male' : 'Female'}</p>
                  <p><span className="font-semibold">Admission:</span> {formatDate(child.admissionDate)}</p>
                  <p><span className="font-semibold">Village:</span> {village.name}</p>
                  <p>
                    <span className="font-semibold">Diagnosis:</span>{' '}
                    {typeof child.diagnosis === 'object'
                      ? child.diagnosis?.status
                      : child.diagnosis || 'Not assessed'}
                  </p>
                   {child.status === 'discharged' && child.discharge && (
                      <>
                          <p><span className="font-semibold">Discharge:</span> {formatDate(child.discharge.date)}</p>
                          <p><span className='capitalize font-semibold'>Reason:</span> <span className='capitalize'>{child.discharge.type.replace('_', ' ')}</span></p>
                      </>
                   )}
              </div>
          </div>
          {/* Right Side: QR Code and Photo */}
          <div className="w-1/3 flex flex-col items-center justify-between">
             <div className="w-12 h-12 rounded-md flex items-center justify-center bg-gray-100">
                  <ChildPlaceholderIcon className="w-8 h-8 text-primary" />
              </div>
              <div style={{ height: "auto", margin: "0 auto", maxWidth: 64, width: "100%" }}>
                <QRCode
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={cardUrl}
                  viewBox={`0 0 256 256`}
                />
              </div>
          </div>
        </div>
      </div>
    );
  }
);

ChildIdentityCard.displayName = 'ChildIdentityCard';

    



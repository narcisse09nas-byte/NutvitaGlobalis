
'use client';

import { CHW, HealthArea, Village } from '@/nutritrack/types';
import QRCode from "react-qr-code";
import { Logo } from './logo';
import React from 'react';

interface ChwIdentityCardProps {
  chw: CHW;
  healthArea: HealthArea;
  village: Village;
}

const ChwPlaceholderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);


export const ChwIdentityCard = React.forwardRef<HTMLDivElement, ChwIdentityCardProps>(
  ({ chw, healthArea, village }, ref) => {

    const cardUrl = typeof window !== 'undefined' ? `${window.location.origin}/chws/${chw.id}` : '';

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
            <p className="text-[10px] whitespace-nowrap">{healthArea.healthDistrict}, {healthArea.region}</p>
          </div>
        </div>
        {/* Body */}
        <div className="flex-grow flex pt-2 gap-2">
          {/* Left Side: Photo & QR */}
           <div className="w-1/3 flex flex-col items-center justify-between">
             <div className="w-12 h-12 rounded-md flex items-center justify-center bg-gray-100 border">
                  <ChwPlaceholderIcon className="w-10 h-10 text-primary" />
              </div>
              <div style={{ height: "auto", margin: "0 auto", maxWidth: 54, width: "100%" }}>
                <QRCode
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={cardUrl}
                  viewBox={`0 0 256 256`}
                />
              </div>
          </div>
          {/* Right Side: Info */}
          <div className="flex-grow space-y-1 pl-1">
              <p className="font-bold text-lg leading-tight">{chw.firstName} {chw.lastName}</p>
              <div className="text-[10px] leading-snug pt-1 space-y-0.5">
                  <p><span className="font-semibold">CHW ID:</span> {chw.chwId}</p>
                  <p><span className="font-semibold">Function:</span> Community Health Worker</p>
                  <p><span className="font-semibold">Phone:</span> {chw.phone}</p>
                  <p><span className="font-semibold">Village:</span> {village.name}</p>
                  <p><span className="font-semibold">Health Facility:</span> {healthArea.healthFacilityName}</p>
              </div>
          </div>
        </div>
      </div>
    );
  }
);

ChwIdentityCard.displayName = 'ChwIdentityCard';



import React, { useState, useEffect } from 'react';

import eGraminLogo from '../assets/images/e-gramin-logo.png';
import banner1 from '../assets/images/banner-1.jpg';
import banner2 from '../assets/images/banner-2.jpg';
import sbiLogo from '../assets/images/sbi.png';
import licLogo from '../assets/images/LIC-Logo.jpg';
import iciciLogo from '../assets/images/icici-bank-ne-logo.jpg';
import hdfcLogo from '../assets/images/hdfc.png';
import nicLogo from '../assets/images/nicjpg.jpeg';
import aprbLogo from '../assets/images/aprb.png';

export const HomePage: React.FC = () => {
  const slides = [
    { src: banner1, alt: 'eGramin Banner 1' },
    { src: banner2, alt: 'eGramin Banner 2' },
  ];
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveSlide((p) => (p === slides.length - 1 ? 0 : p + 1)), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <>
      {/* Banner carousel */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative h-[320px] md:h-[420px] lg:h-[520px]">
          <img src={eGraminLogo} alt="e-Gramin" className="absolute z-10 left-1/2 top-5 -translate-x-1/2 h-10 opacity-90 bg-white/80 rounded px-2 py-1" />
          {slides.map((slide, idx) => (
            <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ${activeSlide === idx ? 'opacity-100' : 'opacity-0'}`}>
              <img src={slide.src} alt={slide.alt} className="w-full h-full object-cover" />
            </div>
          ))}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setActiveSlide((p) => (p === 0 ? slides.length - 1 : p - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-10 h-10 rounded-full grid place-items-center text-xl"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setActiveSlide((p) => (p === slides.length - 1 ? 0 : p + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-10 h-10 rounded-full grid place-items-center text-xl"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setActiveSlide(i)}
                className={`w-3 h-3 rounded-full transition-colors ${activeSlide === i ? 'bg-[#d96305]' : 'bg-white/60 hover:bg-white'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
            Our Banking &amp; <span className="text-[#1b8c4e]">Service Partner&apos;s</span>
          </h3>
          <div className="mx-auto mt-2 h-1 w-12 rounded bg-[#d96305]" />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <img src={licLogo} alt="LIC" className="h-10 object-contain" />
            <img src={sbiLogo} alt="SBI" className="h-10 object-contain" />
            <img src={iciciLogo} alt="ICICI" className="h-10 object-contain" />
            <img src={hdfcLogo} alt="HDFC" className="h-10 object-contain" />
            <img src={nicLogo} alt="NIC" className="h-10 object-contain" />
            <img src={aprbLogo} alt="APRB" className="h-10 object-contain" />
          </div>
        </div>
      </section>
    </>
  );
};
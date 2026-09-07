import React, { useState } from 'react';

import galleryThumb1 from '../assets/images/gallery-images/thumb/01.jpg';
import galleryThumb2 from '../assets/images/gallery-images/thumb/02.jpg';
import galleryThumb3 from '../assets/images/gallery-images/thumb/03.jpg';
import galleryThumb4 from '../assets/images/gallery-images/thumb/04.jpg';
import galleryThumb5 from '../assets/images/gallery-images/thumb/05.jpg';

import galleryFull1 from '../assets/images/gallery-images/full/01.jpg';
import galleryFull2 from '../assets/images/gallery-images/full/02.jpg';
import galleryFull3 from '../assets/images/gallery-images/full/03.jpg';
import galleryFull4 from '../assets/images/gallery-images/full/04.jpg';
import galleryFull5 from '../assets/images/gallery-images/full/05.jpg';

const GALLERY = [
  { thumb: galleryThumb1, full: galleryFull1, title: 'e-Gramin Event 1' },
  { thumb: galleryThumb2, full: galleryFull2, title: 'e-Gramin Event 2' },
  { thumb: galleryThumb3, full: galleryFull3, title: 'e-Gramin Event 3' },
  { thumb: galleryThumb4, full: galleryFull4, title: 'e-Gramin Event 4' },
  { thumb: galleryThumb5, full: galleryFull5, title: 'e-Gramin Event 5' },
];

export const GalleryPage: React.FC = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
            Photo <span className="text-[#1b8c4e]">Gallery</span>
          </h3>
          <div className="mx-auto mt-2 h-1 w-12 rounded bg-[#d96305]" />
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY.map((item, idx) => (
            <div
              key={idx}
              onClick={() => setLightboxIndex(idx)}
              className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200"
              title="Click to view full image"
            >
              <img src={item.thumb} alt={item.title} className="w-full h-52 object-cover transition-transform group-hover:scale-[1.02]" />
            </div>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setLightboxIndex(null)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 text-xl"
            >
              ✕
            </button>
            <img src={GALLERY[lightboxIndex].full} alt={GALLERY[lightboxIndex].title} className="w-full rounded-lg shadow-xl" />
            <button
              type="button"
              onClick={() => setLightboxIndex((prev) => (prev === 0 ? GALLERY.length - 1 : (prev ?? 0) - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-9 h-9 rounded-full grid place-items-center"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex((prev) => (prev === GALLERY.length - 1 ? 0 : (prev ?? 0) + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-9 h-9 rounded-full grid place-items-center"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
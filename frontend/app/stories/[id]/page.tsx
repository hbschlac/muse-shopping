'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock story data
const story = {
  id: '1',
  slides: [
    {
      id: '1',
      image: '/placeholder-story-1.jpg',
      title: 'Summer Edit',
      description: 'Light & breezy pieces for warm days',
    },
    {
      id: '2',
      image: '/placeholder-story-2.jpg',
      title: 'Vintage Finds',
      description: 'Curated vintage treasures',
    },
    {
      id: '3',
      image: '/placeholder-story-3.jpg',
      title: 'Date Night',
      description: 'Romantic looks for special evenings',
    },
  ],
};

export default function StoryPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  // Auto-advance story
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentSlide < story.slides.length - 1) {
            setCurrentSlide((s) => s + 1);
            return 0;
          } else {
            router.back();
            return prev;
          }
        }
        return prev + 2; // 2% every 100ms = 5 seconds per slide
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentSlide, router]);

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentSlide < story.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setProgress(0);
    } else {
      router.back();
    }
  };

  const currentStory = story.slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4">
        {story.slides.map((_, index) => (
          <div key={index} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: index < currentSlide ? '100%' : index === currentSlide ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Close Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors duration-150"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Story Content */}
      <div className="relative h-full">
        {/* Background Image */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-gray-600 text-lg">Story Image: {currentStory.title}</div>
        </div>

        {/* Tap Areas for Navigation */}
        <div className="absolute inset-0 flex">
          <button
            onClick={handlePrevious}
            className="flex-1"
            aria-label="Previous"
          />
          <button
            onClick={handleNext}
            className="flex-1"
            aria-label="Next"
          />
        </div>

        {/* Story Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-2xl font-semibold text-white mb-2">
            {currentStory.title}
          </h2>
          <p className="text-white/90 mb-6">
            {currentStory.description}
          </p>

          {/* CTA Button */}
          <button className="w-full h-12 gradient-primary text-white rounded-full font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
            Shop this look
          </button>
        </div>
      </div>
    </div>
  );
}

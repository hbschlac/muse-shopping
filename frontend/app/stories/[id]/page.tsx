'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock story data with Unsplash images
const story = {
  id: '1',
  slides: [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
      title: 'Trending Now',
      description: 'Discover what everyone is loving this season',
      ctaText: 'See Collection',
      ctaLink: '/discover',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      title: 'New Arrivals',
      description: 'Fresh styles just dropped',
      ctaText: 'Shop Now',
      ctaLink: '/discover',
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
      title: 'Shop the Look',
      description: 'Complete your perfect outfit',
      ctaText: 'Shop this look',
      ctaLink: '/discover',
    },
  ],
};

export default function StoryPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  // Auto-advance story — increment only; navigate in a separate effect
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? prev : prev + 2));
    }, 100);
    return () => clearInterval(interval);
  }, [currentSlide]);

  // Handle slide advancement when progress completes
  useEffect(() => {
    if (progress < 100) return;
    if (currentSlide < story.slides.length - 1) {
      setCurrentSlide((s) => s + 1);
      setProgress(0);
    } else {
      router.back();
    }
  }, [progress, currentSlide, router]);

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
        <div className="absolute inset-0">
          <img
            src={currentStory.image}
            alt={currentStory.title}
            className="w-full h-full object-cover"
          />
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
          <button
            onClick={() => router.push(currentStory.ctaLink)}
            className="w-full h-12 gradient-primary text-white rounded-full font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {currentStory.ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}

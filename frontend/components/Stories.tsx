import Link from 'next/link';

const stories = [
  { id: '1', title: 'Summer', thumbnail: '/placeholder-story-1.jpg' },
  { id: '2', title: 'Vintage', thumbnail: '/placeholder-story-2.jpg' },
  { id: '3', title: 'Date Night', thumbnail: '/placeholder-story-3.jpg' },
  { id: '4', title: 'Work', thumbnail: '/placeholder-story-4.jpg' },
  { id: '5', title: 'Weekend', thumbnail: '/placeholder-story-5.jpg' },
];

export default function Stories() {
  return (
    <div className="py-4 px-4">
      <div className="flex gap-4 overflow-x-auto hide-scrollbar">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/stories/${story.id}`}
            className="flex-shrink-0 group"
          >
            <div className="relative">
              {/* Gradient Ring */}
              <div className="w-20 h-20 rounded-full gradient-primary p-[2.5px]">
                <div className="w-full h-full rounded-full bg-[var(--color-ecru)] p-[3px]">
                  <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                    {/* Story thumbnail would go here */}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-700 text-center truncate w-20">
              {story.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

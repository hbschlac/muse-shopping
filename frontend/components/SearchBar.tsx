'use client';

import { Search as SearchIcon } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  placeholder = "Search or ask Muse...",
  className = ""
}: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="h-[52px] bg-white rounded-[26px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center px-4 mx-4 transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 placeholder:text-gray-400"
        />
        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
      </div>
    </div>
  );
}

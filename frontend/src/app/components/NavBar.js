'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BellIcon, HomeIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

export default function NavBar() {
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Left side - Logos and Title */}
          <div className="flex items-center space-x-8">
            {/* NVIDIA Logo */}
            <div className="relative h-30 w-30 flex-shrink-0">
                <Image
                  src="/nvidia.jpg"
                  alt="NVIDIA Logo"
                  fill
                  className="object-contain filter brightness-110"
                />
              </div>
              
              {/* Twelve Labs Logo */}
              <div className="relative h-30 w-30 flex-shrink-0">
                <Image
                  src="/twelvelabs.png"
                  alt="Twelve Labs Logo"
                  fill
                  className="object-contain filter brightness-110"
                />
              </div>
            
            {/* Title */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-gray-800 whitespace-nowrap tracking-tight font-inter leading-tight">
                NVIDIA VSS Twelve Labs Integration
                <span className="block text-base font-medium text-gray-600 mt-1">Manufacturing Automation</span>
              </h1>
            </div>
            
            {/* Medium screens title */}
            <div className="hidden sm:block lg:hidden">
              <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap tracking-tight font-inter">
                NVIDIA + Twelve Labs
              </h1>
            </div>
            
            {/* Mobile Title */}
            <div className="sm:hidden">
              <h1 className="text-base font-semibold text-gray-800 tracking-tight font-inter">
                NVIDIA + TL
              </h1>
            </div>
          </div>

          {/* Right side - Navigation */}
          <div className="flex items-center space-x-10">
            {/* Dashboard Button */}
            <Link href="/" className="flex flex-row items-center space-x-3 px-6 py-4 rounded-xl text-lg font-medium font-inter text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 ease-in-out hover:shadow-md group">
              <HomeIcon className="h-6 w-6 flex-shrink-0" />
              <span className="hidden md:block font-medium whitespace-nowrap">Dashboard</span>
            </Link>

            {/* Clips Button */}
            <Link href="/clips" className="flex flex-row items-center space-x-3 px-6 py-4 rounded-xl text-lg font-medium font-inter text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 ease-in-out hover:shadow-md group">
              <VideoCameraIcon className="h-6 w-6 flex-shrink-0" />
              <span className="hidden md:block font-medium whitespace-nowrap">Clips</span>
            </Link>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="cursor-pointer flex flex-row items-center  px-6 py-4 rounded-xl text-lg font-medium font-inter text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 ease-in-out hover:shadow-md group relative"
                aria-label="Notifications"
              >
                <BellIcon className="h-6 w-6 flex-shrink-0" />
                
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse"></span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {/* Sample notifications */}
                    <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">Motion detected in Assembly Line 3</p>
                          <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-yellow-500 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">Quality control alert: Anomaly detected</p>
                          <p className="text-xs text-gray-500 mt-1">5 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">Production line operating normally</p>
                          <p className="text-xs text-gray-500 mt-1">15 minutes ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}

    </nav>
  );
}

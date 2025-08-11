import React from 'react';
import Blob from "./blobs.jsx";

const BlobBackground = () => {
    return (
<div className="absolute top-0 left-0 w-full h-[150%] pointer-events-none -translate-y-32">
    {/* Blobs for desktop */}
    <Blob
        color="bg-purple-800"
                size="w-[45rem] h-[45rem]"
                position="-top-[10%] -left-[10%]"
                delay="animation-delay-1000"
                style={{ zIndex: 0 }}
                className="hidden md:block"
            />
            <Blob
                color="bg-purple-500"
                size="w-[45rem] h-[45rem]"
                position="-top-[22%] -right-[13%]"
                delay="animation-delay-2500"
                style={{ zIndex: 0 }}
                className="hidden md:block"
            />
            <Blob
                color="bg-purple-900"
                size="w-[20rem] h-[20rem]"
                position="absolute top-1/2 right-10 -translate-y-1/2"
                delay="animation-delay-1000"
                style={{ zIndex: 0 }}
                className="block md:hidden"
            />
            <Blob
                color="bg-indigo-400"
                size="w-[30rem] h-[30rem]"
                position="top-[10%] left-[22%]"
                delay="animation-delay-1200"
                style={{ zIndex: 1 }}
                className="hidden md:block"
            />
            <Blob
                color="bg-blue-400"
                size="w-[30rem] h-[30rem]"
                position="top-[6%] right-[28%]"
                delay="animation-delay-2200"
                style={{ zIndex: 1 }}
                className="hidden md:block"
            />
            <Blob
                color="bg-blue-400"
                size="w-[30rem] h-[30rem]"
                position="top-[33%] right-[12%]"
                delay="animation-delay-1800"
                style={{ zIndex: 4 }}
                className="hidden md:block"
            />

            {/* Mobile side blobs */}
            <div className="block md:hidden absolute top-6 right-4 flex-col gap-6 z-10">
                <Blob
                    color="bg-yellow-400"
                    size="w-[12rem] h-[12rem]"
                    position="relative"
                    delay="animation-delay-1200"
                    style={{ zIndex: 1 }}
                />
                <Blob
                    color="bg-yellow-400"
                    size="w-[12rem] h-[12rem]"
                    position="relative -top-3"
                    delay="animation-delay-2200"
                    style={{ zIndex: 1 }}
                />
            </div>

            {/* Center blobs */}
            <div className="absolute inset-0 flex items-center justify-center gap-20 z-10 md:flex">
                <Blob
                    color="bg-yellow-400"
                    size="w-[36rem] h-[36rem]"
                    position="absolute top-[28%] right-[30%] -translate-x-1/2 -translate-y-1/2"
                    delay="animation-delay-1700"
                    style={{ zIndex: 3 }}
                    className="hidden md:block"
                />
                <Blob
                    color="bg-red-500"
                    size="w-[34rem] h-[34rem]"
                    position="absolute top-[28%] right-[53%] -translate-x-1/2 -translate-y-1/2"
                    delay="animation-delay-900"
                    style={{ zIndex: 5 }}
                    className="hidden md:block"
                />
            </div>

            {/* Mobile bottom blobs */}
            <Blob
                color="bg-red-500"
                size="w-[25rem] h-[25rem]"
                position="absolute top-4 left-4"
                delay="animation-delay-1700"
                style={{ zIndex: 5 }}
                className="block md:hidden"
            />
            <Blob
                color="bg-indigo-500"
                size="w-[25rem] h-[25rem]"
                position="absolute -bottom-1 -right-1"
                delay="animation-delay-900"
                style={{ zIndex: 5 }}
                className="block md:hidden"
            />

            {/* Blur overlay */}
            <div className="absolute inset-0 backdrop-blur-4xl"></div>
        </div>
    );
};

export default BlobBackground;

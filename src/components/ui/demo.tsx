'use client';

import { LayoutGroup, motion } from "framer-motion";
import { Link } from "react-router-dom";

import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { TextRotate } from "@/components/ui/text-rotate";

const exampleImages = [
  {
    url: "https://images.unsplash.com/photo-1727341554370-80e0fe9ad082?q=80&w=2276&auto=format&fit=crop",
    author: "Branislav Rodman",
    title: "A Black and White Photo of a Woman Brushing Her Teeth"
  },
  {
    url: "https://images.unsplash.com/photo-1640680608781-2e4199dd1579?q=80&w=3087&auto=format&fit=crop",
    title: "Neon Palm",
    author: "Tim Mossholder"
  },
  {
    url: "https://images.unsplash.com/photo-1726083085160-feeb4e1e5b00?q=80&w=3024&auto=format&fit=crop",
    author: "ANDRII SOLOK",
    title: "A blurry photo of a crowd of people"
  },
  {
    url: "https://images.unsplash.com/photo-1562016600-ece13e8ba570?q=80&w=2838&auto=format&fit=crop",
    author: "Wesley Tingey",
    title: "Rippling Crystal Blue Water"
  },
  {
    url: "https://images.unsplash.com/photo-1624344965199-ed40391d20f2?q=80&w=2960&auto=format&fit=crop",
    author: "Serhii Tyaglovsky",
    title: "Portrait under blue sky"
  }
];

export function LandingHero() {
  return (
    <section className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden md:overflow-visible">
      <Floating sensitivity={-0.5} className="h-full">
        <FloatingElement depth={0.5} className="top-[18%] left-[5%] md:top-[24%] md:left-[8%]">
          <motion.img
            src={exampleImages[0].url}
            alt={exampleImages[0].title}
            className="h-12 w-16 rotate-[-3deg] cursor-pointer rounded-xl object-cover shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-16 sm:w-24 md:h-20 md:w-28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          />
        </FloatingElement>

        <FloatingElement depth={1} className="top-[8%] left-[15%] md:top-[8%] md:left-[18%]">
          <motion.img
            src={exampleImages[1].url}
            alt={exampleImages[1].title}
            className="h-28 w-40 -rotate-12 cursor-pointer rounded-xl object-cover shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-36 sm:w-48 md:h-44 md:w-56"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          />
        </FloatingElement>

        <FloatingElement depth={4} className="top-[78%] left-[8%] md:top-[74%] md:left-[10%]">
          <motion.img
            src={exampleImages[2].url}
            alt={exampleImages[2].title}
            className="h-40 w-40 -rotate-[4deg] cursor-pointer rounded-xl object-cover shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-48 sm:w-48 md:h-56 md:w-56"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          />
        </FloatingElement>

        <FloatingElement depth={2} className="top-[5%] left-[78%] md:top-[8%] md:left-[75%]">
          <motion.img
            src={exampleImages[3].url}
            alt={exampleImages[3].title}
            className="h-36 w-40 rotate-[6deg] cursor-pointer rounded-xl object-cover shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-44 sm:w-48 md:h-52 md:w-60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          />
        </FloatingElement>

        <FloatingElement depth={1} className="top-[65%] left-[74%] md:top-[62%] md:left-[72%]">
          <motion.img
            src={exampleImages[4].url}
            alt={exampleImages[4].title}
            className="h-44 w-44 rotate-[19deg] cursor-pointer rounded-xl object-cover shadow-2xl transition-transform duration-200 hover:scale-105 sm:h-56 sm:w-56 md:h-64 md:w-64"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          />
        </FloatingElement>
      </Floating>

      <div className="z-20 flex w-[260px] flex-col items-center justify-center sm:w-[320px] md:w-[520px] lg:w-[620px]">
        <motion.h1
          className="flex w-full flex-col items-center justify-center space-y-1 whitespace-pre text-center text-3xl leading-tight font-semibold tracking-tight sm:text-5xl md:space-y-3 md:text-6xl lg:text-7xl"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.3 }}
        >
          <span>Make your</span>
          <LayoutGroup>
            <motion.span layout className="flex whitespace-pre">
              <motion.span
                layout
                className="flex whitespace-pre"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              >
                Page{" "}
              </motion.span>
              <TextRotate
                texts={[
                  "fancy",
                  "fun",
                  "lovely ♥",
                  "weird",
                  "🪩 funky",
                  "💃🕺",
                  "sexy",
                  "🕶️ cool",
                  "go 🚀",
                  "🔥🔥🔥",
                  "over-animated?",
                  "pop ✨",
                  "rock 🤘"
                ]}
                mainClassName="overflow-hidden rounded-xl py-0 pb-1 pr-2 text-[#4f62ff] md:pb-2"
                staggerDuration={0.03}
                staggerFrom="last"
                rotationInterval={3000}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            </motion.span>
          </LayoutGroup>
        </motion.h1>

        <motion.p
          className="pt-4 text-center text-sm text-zinc-200 sm:text-lg md:pt-8 md:text-xl"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.5 }}
        >
          with a growing library of ready-to-use react components & microinteractions. free & open source.
        </motion.p>

        <div className="mt-8 flex flex-row items-center justify-center space-x-3 text-xs sm:mt-12 md:mt-16">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.7 }}
            whileHover={{
              scale: 1.05,
              transition: { type: "spring", damping: 30, stiffness: 400 }
            }}
          >
            <Link
              to="/community"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold tracking-tight text-black shadow-2xl md:text-base"
            >
              Check docs <span className="ml-1 font-serif">→</span>
            </Link>
          </motion.div>

          <motion.a
            href="https://github.com/danielpetho/fancy"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#0015ff] px-5 py-2.5 text-sm font-semibold tracking-tight text-white shadow-2xl md:text-base"
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.7 }}
            whileHover={{
              scale: 1.05,
              transition: { type: "spring", damping: 30, stiffness: 400 }
            }}
          >
            ★ on GitHub
          </motion.a>
        </div>
      </div>
    </section>
  );
}

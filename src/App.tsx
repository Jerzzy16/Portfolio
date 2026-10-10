import Contact from '@/components/Contact';
import Education from '@/components/Education';
import Experience from '@/components/Experience';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Projects from '@/components/Projects';
import Skills from '@/components/Skills';
import SmoothScroll from '@/components/SmoothScroll';

export default function App() {
  return (
    <div className="relative min-h-[100dvh]">
      <SmoothScroll />

      {/* First tab stop. The nav sits above the hero, so without this a keyboard
          user walks five links before reaching any content. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-action focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to Content
      </a>

      <Header />
      <main id="main" className="relative z-10">
        <Hero />
        <Experience />
        <Projects />
        <Skills />
        <Education />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
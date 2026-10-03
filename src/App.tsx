import Contact from '@/components/Contact';
import Education from '@/components/Education';
import Experience from '@/components/Experience';
import Footer from '@/components/Footer';
import GridField from '@/components/GridField';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Projects from '@/components/Projects';
import Skills from '@/components/Skills';

export default function App() {
  return (
    <div className="relative min-h-[100dvh]">
      <GridField />
      <Header />
      <main className="relative z-10">
        <Hero />
        <Projects />
        <Skills />
        <Education />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
import { useEffect, useCallback } from 'react';
import { usePresentationStore } from './store/usePresentationStore';
import { slideData } from './slides/slideData';
import { loadGitContext } from './utils/gitContext';
import NavBar from './components/NavBar';
import SlideRenderer from './components/SlideRenderer';
import ChatSidebar from './components/ChatSidebar';
import './App.css';

export default function App() {
  const { currentSlide, slides, setSlides, setGitContext, gitContext, nextSlide, prevSlide, sidebarOpen } = usePresentationStore();

  useEffect(() => {
    setSlides(slideData);
    loadGitContext('.').then(setGitContext);
  }, []);

  // Keyboard navigation
  const handleKey = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') nextSlide();
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevSlide();
  }, [nextSlide, prevSlide]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const slide = slides[currentSlide];

  return (
    <div className="app">
      <NavBar />
      <div className={`main-area ${sidebarOpen ? 'with-sidebar' : ''}`}>
        <main className="slide-stage">
          {slide && (
            <div className="slide-content" key={slide.id}>
              <div className="slide-header">
                <h2 className="slide-title">{slide.title}</h2>
                <span className="slide-type-badge">{slide.type}</span>
              </div>
              <SlideRenderer slide={slide} gitContext={gitContext} />
            </div>
          )}
        </main>
        {sidebarOpen && <ChatSidebar slideTitle={slide?.title} />}
      </div>
    </div>
  );
}

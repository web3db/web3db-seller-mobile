declare module '@splidejs/react-splide' {
  import { ComponentType, ReactNode } from 'react';

  export interface SplideProps {
    options?: {
      type?: 'slide' | 'loop' | 'fade';
      autoplay?: boolean;
      interval?: number;
      pauseOnHover?: boolean;
      pauseOnFocus?: boolean;
      arrows?: boolean;
      pagination?: boolean;
      speed?: number;
      perPage?: number;
      gap?: string | number;
      rewind?: boolean;
      [key: string]: unknown;
    };
    children?: ReactNode;
    className?: string;
  }

  export interface SplideSlideProps {
    children?: ReactNode;
    className?: string;
  }

  export const Splide: ComponentType<SplideProps>;
  export const SplideSlide: ComponentType<SplideSlideProps>;
}

declare module '@splidejs/react-splide/css';

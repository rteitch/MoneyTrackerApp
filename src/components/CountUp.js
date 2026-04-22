import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { formatRupiah, formatRupiahFull } from '../utils/formatting';

export default function CountUp({ value = 0, style, isFull = false }) {
  const numericValue = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(0);
  const currentDisplayValue = useRef(0);
  const startTime = useRef(Date.now());
  const duration = 1200; // sedikit diperlama agar lebih dramatis
  const initialValue = useRef(0);
  const targetValue = useRef(numericValue);

  useEffect(() => {
    initialValue.current = currentDisplayValue.current;
    targetValue.current = numericValue;
    startTime.current = Date.now();
    
    let animationFrame;
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime.current) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = Math.floor(initialValue.current + (targetValue.current - initialValue.current) * easeProgress);
      currentDisplayValue.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [numericValue]);

  return (
    <Text style={style}>
      {isFull ? formatRupiahFull(displayValue) : formatRupiah(displayValue)}
    </Text>
  );
}

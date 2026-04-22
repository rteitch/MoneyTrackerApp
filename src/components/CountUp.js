import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { formatRupiah, formatRupiahFull } from '../utils/formatting';

export default function CountUp({ value, style, isFull = false }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(Date.now());
  const duration = 1000; // ms
  const initialValue = useRef(0);
  const targetValue = useRef(value);

  useEffect(() => {
    initialValue.current = displayValue;
    targetValue.current = value;
    startTime.current = Date.now();
    
    let animationFrame;
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime.current) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = Math.floor(initialValue.current + (targetValue.current - initialValue.current) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <Text style={style}>
      {isFull ? formatRupiahFull(displayValue) : formatRupiah(displayValue)}
    </Text>
  );
}

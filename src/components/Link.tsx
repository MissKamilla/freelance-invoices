'use client';
// Next.js 16: Server Components не можуть передати next/link у MUI-компонент через `component`,
// тому реекспортуємо його як клієнтський модуль.
import Link from 'next/link';

export default Link;

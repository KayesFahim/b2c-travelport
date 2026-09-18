// 10 distinct themes for FlyJatt
export const themes = [
    {
        name: 'Classic Blue',
        colors: {
            primary: '#1e3a8a',
            secondary: '#3b82f6',
            accent: '#fbbf24',
            background: '#f1f5f9',
            text: '#1e293b',
        },
        font: 'Inter, sans-serif',
        borderRadius: '8px',
    },
    {
        name: 'Sunset Orange',
        colors: {
            primary: '#ff6b35',
            secondary: '#f7c59f',
            accent: '#ef8354',
            background: '#f9f9f9',
            text: '#22223b',
        },
        font: 'Roboto, sans-serif',
        borderRadius: '12px',
    },
    {
        name: 'Emerald Green',
        colors: {
            primary: '#10b981',
            secondary: '#6ee7b7',
            accent: '#facc15',
            background: '#ecfdf5',
            text: '#065f46',
        },
        font: 'Montserrat, sans-serif',
        borderRadius: '6px',
    },
    {
        name: 'Royal Purple',
        colors: {
            primary: '#7c3aed',
            secondary: '#c4b5fd',
            accent: '#f472b6',
            background: '#f3e8ff',
            text: '#3b0764',
        },
        font: 'Poppins, sans-serif',
        borderRadius: '10px',
    },
    {
        name: 'Elegant Black',
        colors: {
            primary: '#18181b',
            secondary: '#27272a',
            accent: '#f59e42',
            background: '#fafafa',
            text: '#18181b',
        },
        font: 'Lato, sans-serif',
        borderRadius: '4px',
    },
    {
        name: 'Aqua Fresh',
        colors: {
            primary: '#06b6d4',
            secondary: '#67e8f9',
            accent: '#f472b6',
            background: '#f0fdfa',
            text: '#134e4a',
        },
        font: 'Nunito, sans-serif',
        borderRadius: '16px',
    },
    {
        name: 'Sunny Yellow',
        colors: {
            primary: '#fde047',
            secondary: '#facc15',
            accent: '#f87171',
            background: '#fffde7',
            text: '#92400e',
        },
        font: 'Quicksand, sans-serif',
        borderRadius: '20px',
    },
    {
        name: 'Rose Pink',
        colors: {
            primary: '#f472b6',
            secondary: '#fbcfe8',
            accent: '#818cf8',
            background: '#fff1f2',
            text: '#831843',
        },
        font: 'Raleway, sans-serif',
        borderRadius: '14px',
    },
    {
        name: 'Slate Gray',
        colors: {
            primary: '#64748b',
            secondary: '#cbd5e1',
            accent: '#38bdf8',
            background: '#f8fafc',
            text: '#0f172a',
        },
        font: 'Open Sans, sans-serif',
        borderRadius: '8px',
    },
    {
        name: 'Forest Dark',
        colors: {
            primary: '#14532d',
            secondary: '#22c55e',
            accent: '#fbbf24',
            background: '#f0fdf4',
            text: '#052e16',
        },
        font: 'Merriweather, serif',
        borderRadius: '18px',
    },
];

export type Theme = typeof themes[number];

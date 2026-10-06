/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        enterprise: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          brand: '#0284C7',
          brandHover: '#0369A1',
          textPrimary: '#0F172A',
          textSecondary: '#475569',
          status: {
            success: '#16A34A',
            'success-bg': '#DCFCE7',
            'success-text': '#16A34A',
            warning: '#CA8A04',
            'warning-bg': '#FEF9C3',
            'warning-text': '#CA8A04',
            danger: '#DC2626',
            'danger-bg': '#FEE2E2',
            'danger-text': '#DC2626',
          },
        },
      },
    },
  },
  plugins: [],
}

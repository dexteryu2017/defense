# Victor Nova Defense (Victor新星防御)

A high-intensity, bilingual (English/Chinese) Missile Command style tower defense game. Protect your cities and launchers from falling rockets using missile interceptors.

## 🚀 Deployment

This project is optimized for deployment on **Vercel** or any other static hosting service (Netlify, GitHub Pages, etc.).

### Deploy to Vercel

1. **Export to GitHub**: Use the "Export to GitHub" option in the Google AI Studio settings menu.
2. **Connect to Vercel**: Import the repository into your Vercel account.
3. **Environment Variables**: Add your `GEMINI_API_KEY` to Vercel's Environment Variables if you use any AI features.
4. **Build Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

## 🛠 Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## 🎮 Gameplay

- **Defensive Goal**: Protect 6 cities and 3 launchers.
- **Controls**: Click or tap anywhere to fire an interceptor.
- **Victory**: Reach 1000 points.
- **Defeat**: All cities or all launchers are destroyed.

## 📄 License

SPDX-License-Identifier: Apache-2.0

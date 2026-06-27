# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Routes

- `/` Weather dashboard
- `/vibe` Vibe Control page (reads 3 microphone values from MQTT topics)

## MQTT Setup for Vibe Control

1. Copy `.env.example` to `.env`.
2. Set your MQTT broker URL and topic names.

Environment variables used by the app:

- `VITE_MQTT_BROKER_URL`
- `VITE_MQTT_TOPIC_1`
- `VITE_MQTT_TOPIC_2`
- `VITE_MQTT_TOPIC_3`
- `VITE_MQTT_STATUS_TOPIC`
- `VITE_THRESHOLD_MEETING`
- `VITE_THRESHOLD_STUDY`
- `VITE_THRESHOLD_RELAX`

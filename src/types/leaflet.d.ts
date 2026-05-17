import "leaflet";

declare module "leaflet" {
  interface Marker {
    slideTo(
      latlng: [number, number],
      options?: {
        duration?: number;
        keepAtCenter?: boolean;
      }
    ): void;
  }
}
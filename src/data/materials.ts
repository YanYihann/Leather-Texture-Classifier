import manifest from './materials.json';
import { publicAsset } from '../services/assets';

export default manifest.map(material => ({
  ...material,
  image: publicAsset(material.image),
  thumbnail: publicAsset(material.thumbnail),
}));

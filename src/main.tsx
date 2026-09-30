import { connect } from 'datocms-plugin-sdk';
import 'datocms-react-ui/styles.css';
import ConfigScreen from './entrypoints/ConfigScreen';
import PolygonField from './entrypoints/PolygonField';
import { render } from './utils/render';

const POLYGONS_EXTENSION_ID = 'geojsonPolygons';
type FieldExtensionId = typeof POLYGONS_EXTENSION_ID;

function parseFieldExtensionId(value: string): FieldExtensionId {
  if (value === POLYGONS_EXTENSION_ID) {
    return value;
  }

  throw new Error(`Unknown field extension: ${value}`);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled field extension: ${String(value)}`);
}

connect({
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },

  manualFieldExtensions() {
    return [
      {
        id: POLYGONS_EXTENSION_ID,
        name: 'GeoJSON polygons',
        type: 'editor',
        fieldTypes: ['json'],
      },
    ];
  },

  renderFieldExtension(fieldExtensionId, ctx) {
    const extensionId = parseFieldExtensionId(fieldExtensionId);

    switch (extensionId) {
      case POLYGONS_EXTENSION_ID:
        // Remount per field path so switching locales loads that locale's value.
        render(<PolygonField key={ctx.fieldPath} ctx={ctx} />);
        return;
      default:
        assertNever(extensionId);
    }
  },
});

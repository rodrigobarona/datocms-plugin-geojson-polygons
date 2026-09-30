import { Dropdown, DropdownMenu, DropdownOption } from 'datocms-react-ui';
import { BASEMAP_IDS, getBasemap, type BasemapId } from '../lib/basemaps';
import styles from './BasemapControl.module.css';

type BasemapControlProps = {
  value: BasemapId;
  onChange: (id: BasemapId) => void;
};

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.5 2 4.5 8 7.5 14 4.5 8 1.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M2 8 8 11 14 8"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M2 11.5 8 14.5 14 11.5"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export default function BasemapControl({ value, onChange }: BasemapControlProps) {
  return (
    <div className={styles.control}>
      <Dropdown
        renderTrigger={({ open, onClick }) => (
          <button
            type="button"
            className={open ? styles.buttonOpen : styles.button}
            aria-label={`Map style: ${getBasemap(value).label}`}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={onClick}
          >
            <LayersIcon />
          </button>
        )}
      >
        <DropdownMenu alignment="right">
          {BASEMAP_IDS.map((id) => (
            <DropdownOption key={id} active={id === value} onClick={() => onChange(id)}>
              {getBasemap(id).label}
            </DropdownOption>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

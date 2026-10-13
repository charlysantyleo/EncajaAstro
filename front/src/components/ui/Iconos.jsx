// Iconos de la tienda: una sola familia (Phosphor) con un solo peso.
// Se exportan con los nombres que ya usan los componentes, asi cambiar de familia es tocar solo este archivo.
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ArrowUpRightIcon,
  CarIcon,
  ChartBarIcon,
  CaretUpDownIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleNotchIcon,
  CopyIcon,
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon,
  GarageIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  MoonIcon,
  NotePencilIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ScrollIcon,
  SealCheckIcon,
  SignInIcon,
  SignOutIcon,
  StorefrontIcon,
  SunIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';

const PESO = 'regular';

// strokeWidth era de la familia anterior; Phosphor usa "weight".
function icono(Componente) {
  function Icono({ strokeWidth, size = 18, ...resto }) {
    return <Componente size={size} weight={PESO} aria-hidden="true" {...resto} />;
  }
  return Icono;
}

export const ArrowLeft = icono(ArrowLeftIcon);
export const ArrowRight = icono(ArrowRightIcon);
export const ArrowUpRight = icono(ArrowUpRightIcon);
export const Car = icono(CarIcon);
export const ChartBar = icono(ChartBarIcon);
export const Check = icono(CheckIcon);
export const ChevronsUpDown = icono(CaretUpDownIcon);
export const CircleAlert = icono(WarningCircleIcon);
export const CircleCheck = icono(CheckCircleIcon);
export const Copy = icono(CopyIcon);
export const CreditCard = icono(CreditCardIcon);
export const ExternalLink = icono(ArrowSquareOutIcon);
export const Eye = icono(EyeIcon);
export const EyeOff = icono(EyeSlashIcon);
export const Link = icono(LinkIcon);
export const Loader2 = icono(CircleNotchIcon);
export const LogIn = icono(SignInIcon);
export const LogOut = icono(SignOutIcon);
export const Minus = icono(MinusIcon);
export const Moon = icono(MoonIcon);
export const NotebookPen = icono(NotePencilIcon);
export const Package = icono(PackageIcon);
export const PartyPopper = icono(SealCheckIcon);
export const Plus = icono(PlusIcon);
export const Receipt = icono(ReceiptIcon);
export const RotateCw = icono(ArrowClockwiseIcon);
export const ScrollText = icono(ScrollIcon);
export const Search = icono(MagnifyingGlassIcon);
export const Store = icono(StorefrontIcon);
export const Sun = icono(SunIcon);
export const Trash2 = icono(TrashIcon);
export const TriangleAlert = icono(WarningIcon);
export const Truck = icono(TruckIcon);
export const UserRound = icono(UserIcon);
export const Warehouse = icono(GarageIcon);
export const X = icono(XIcon);

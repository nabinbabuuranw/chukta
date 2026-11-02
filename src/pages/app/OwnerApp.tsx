import { AppShell } from '../../components/AppShell';
import Overview from './Overview';
import Bills from './Bills';
import BillEditor from './BillEditor';
import BillDetail from './BillDetail';
import Clients, { ClientLedger } from './Clients';
import Reports from './Reports';
import Settings from './Settings';
import { NotFound } from '../NotFound';

export default function OwnerApp({ path }: { path: string }) {
  let m: RegExpMatchArray | null; let page;
  if (path === '/app') page = <Overview />;
  else if (path === '/app/bills') page = <Bills />;
  else if (path === '/app/bills/new') page = <BillEditor key="new" />;
  else if ((m = path.match(/^\/app\/bills\/(\d+)\/edit$/))) page = <BillEditor key={'e' + m[1]} id={Number(m[1])} />;
  else if ((m = path.match(/^\/app\/bills\/(\d+)$/))) page = <BillDetail key={m[1]} id={Number(m[1])} />;
  else if (path === '/app/clients') page = <Clients />;
  else if ((m = path.match(/^\/app\/clients\/(\d+)$/))) page = <ClientLedger key={m[1]} id={Number(m[1])} />;
  else if (path === '/app/reports') page = <Reports />;
  else if (path === '/app/settings') page = <Settings />;
  else return <NotFound />;
  return <AppShell>{page}</AppShell>;
}

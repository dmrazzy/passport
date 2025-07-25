import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerOverlay } from "@chakra-ui/react";
import { chains } from "../utils/chains";
import { NetworkCard } from "./NetworkCard";
import { useCustomization } from "../hooks/useCustomization";
import { mintFee } from "../config/mintFee";
import { parseValidChains } from "../hooks/useOnChainStatus";
import { Button } from "./Button";
import { CancelButton } from "./CancelButton";

type OnchainSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function OnchainSidebar({ isOpen, onClose }: OnchainSidebarProps) {
  const customization = useCustomization();
  const validChains = chains.filter((chain) => parseValidChains(customization, chain));
  return (
    <Drawer isOpen={isOpen} placement="right" size="xl" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent className="rounded-l-2xl pl-2 pt-2">
        <DrawerHeader className="text-center text-color-4">
          <div className="grid grid-cols-2 justify-center text-left">
            <div className="mb-2 font-normal text-base">
              <h2 className="text-2xl font-heading grow">Go Onchain</h2>
              <p>
                Minting your Passport onchain creates a tamper-proof record of your Passport onchain. This is only
                required if you&apos;re using applications that fetch Passport data onchain.
              </p>
            </div>
            <div className="grid grid-cols-1 grid-rows-3">
              <div className="flex justify-end items-start">
                <CancelButton onClose={onClose} />
              </div>
              <div className="flex items-start justify-end row-span-2">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21.3336 10.6674H13.3336C12.6263 10.6674 11.9481 10.9484 11.448 11.4485C10.9479 11.9486 10.6669 12.6269 10.6669 13.3341C10.6669 14.0414 10.9479 14.7196 11.448 15.2197C11.9481 15.7198 12.6263 16.0008 13.3336 16.0008H18.6669C19.3742 16.0008 20.0524 16.2817 20.5525 16.7818C21.0526 17.2819 21.3336 17.9602 21.3336 18.6674C21.3336 19.3747 21.0526 20.053 20.5525 20.5531C20.0524 21.0532 19.3742 21.3341 18.6669 21.3341H10.6669M16.0003 24.0008V8.00078M5.13359 11.4941C4.93898 10.6175 4.96886 9.7059 5.22047 8.8439C5.47207 7.9819 5.93725 7.19737 6.57288 6.56308C7.20851 5.92878 7.994 5.46524 8.85653 5.21544C9.71906 4.96564 10.6307 4.93767 11.5069 5.13411C11.9892 4.37985 12.6536 3.75913 13.4389 3.32916C14.2241 2.8992 15.105 2.67383 16.0003 2.67383C16.8955 2.67383 17.7764 2.8992 18.5617 3.32916C19.3469 3.75913 20.0113 4.37985 20.4936 5.13411C21.3711 4.93681 22.2844 4.96466 23.1483 5.21507C24.0122 5.46547 24.7987 5.9303 25.4347 6.56632C26.0707 7.20234 26.5356 7.98888 26.786 8.85278C27.0364 9.71669 27.0642 10.6299 26.8669 11.5074C27.6212 11.9897 28.2419 12.6541 28.6719 13.4394C29.1018 14.2246 29.3272 15.1055 29.3272 16.0008C29.3272 16.896 29.1018 17.7769 28.6719 18.5622C28.2419 19.3474 27.6212 20.0118 26.8669 20.4941C27.0634 21.3703 27.0354 22.282 26.7856 23.1445C26.5358 24.007 26.0723 24.7925 25.438 25.4282C24.8037 26.0638 24.0191 26.529 23.1571 26.7806C22.2951 27.0322 21.3836 27.0621 20.5069 26.8674C20.0253 27.6246 19.3604 28.248 18.5738 28.6799C17.7872 29.1118 16.9043 29.3382 16.0069 29.3382C15.1096 29.3382 14.2267 29.1118 13.4401 28.6799C12.6535 28.248 11.9886 27.6246 11.5069 26.8674C10.6307 27.0639 9.71906 27.0359 8.85653 26.7861C7.994 26.5363 7.20851 26.0728 6.57288 25.4385C5.93725 24.8042 5.47207 24.0197 5.22047 23.1577C4.96886 22.2957 4.93898 21.3841 5.13359 20.5074C4.37353 20.0264 3.74748 19.361 3.31366 18.5731C2.87983 17.7851 2.65234 16.9003 2.65234 16.0008C2.65234 15.1013 2.87983 14.2164 3.31366 13.4285C3.74748 12.6405 4.37353 11.9751 5.13359 11.4941Z"
                    stroke="#737373"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex-col pl-2">
                  <div className="font-normal text-sm text-nowrap">Minting Fee</div>
                  <div className="font-bold text-sm">-$3.00</div>
                </div>
              </div>
            </div>
          </div>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid grid-cols-[repeat(auto-fit,_minmax(250px,_1fr))] gap-3">
            {validChains.map((chain) => (
              <NetworkCard key={chain.id} chain={chain} />
            ))}
          </div>
          <Button variant="secondary" onClick={onClose} className="w-full rounded-lg">
            Close
          </Button>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

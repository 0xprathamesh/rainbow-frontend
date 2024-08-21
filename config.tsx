"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { AppProps } from "next/app";
import {
  AuthenticationStatus,
  ConnectButton,
  createAuthenticationAdapter,
  getDefaultConfig,
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { createConfig, http, WagmiProvider } from "wagmi";

import { mainnet } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SiweMessage } from "siwe";

const config = createConfig({
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(),
     
    },
  })

const queryClient = new QueryClient();

const RainbowConfig = ({ Component, pageProps }: AppProps) => {
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>("loading");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("http://localhost:8080/me");
        const { address } = await response.json();
        setAuthStatus(address ? "authenticated" : "unauthenticated");
      } catch (error) {
        console.log("error: ", error);
        setAuthStatus("unauthenticated");
      }
    };

    fetchUser();

    window.addEventListener("focus", fetchUser);

    return () => {
      window.removeEventListener("focus", fetchUser);
    };
  }, []);

  const authAdapter = useMemo(() => {
    return createAuthenticationAdapter({
      getNonce: async () => {
        const response = await fetch("http://localhost:8080/nonce");
        const { nonce } = await response.json();
        return nonce;
      },

      createMessage: ({ nonce, address, chainId }) => {
        return new SiweMessage({
          domain: window.location.host,
          address,
          statement: "Sign in with Ethereum to the app.",
          uri: window.location.origin,
          version: "1",
          chainId,
          nonce,
        });
      },

      getMessageBody: ({ message }) => {
        return message.prepareMessage();
      },

      verify: async ({ message, signature }) => {
        const verifyRes = await fetch("http://localhost:8080/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature }),
        });

        return Boolean(verifyRes.ok);
      },

      signOut: async () => {
        console.log("Signing out");
        await fetch("http://localhost:8080/logout");
      },
    });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitAuthenticationProvider
          adapter={authAdapter}
          status={authStatus}
        >
          <RainbowKitProvider>
            <Component {...pageProps} />
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default RainbowConfig;

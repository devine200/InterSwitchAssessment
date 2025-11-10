# Asset Registry System

A job assessment codebase by **Samuel Emeh** demonstrating a complete blockchain-based asset registry system. This project implements a decentralized asset management system using Ethereum smart contracts, with a backend API for event tracking and data analysis capabilities.

## Project Overview

The Asset Registry System allows users to register, track, and transfer digital assets on the Ethereum blockchain. It consists of a smart contract deployed on Sepolia testnet, a Node.js backend that listens to blockchain events, and data analysis tools.

## Folder Structure

### `asset-registry-contract/`
Smart contract implementation using Solidity and Hardhat. Contains the `AssetRegistry` contract that handles asset registration, ownership tracking, and transfers. Includes deployment scripts, tests, and deployment information.

**Deployed Contract:** `0x4de8A863f6FCa76498D26BE85Ff1323F5E01A6c2` (Sepolia testnet)

### `asset-registry-backend/`
Node.js/Express backend service that connects to the blockchain, listens for contract events (`AssetRegistered`, `AssetTransferred`), and stores data in a SQLite database. Provides REST API endpoints to query assets, transfers, and events.

### `data-analysis/`
Jupyter notebook for analyzing blockchain events and generating analytics. Queries the backend API to produce insights on asset registrations, transfers, and owner activity trends.

### `block-project-pitch/`
Project documentation and pitch materials describing the system architecture for a potential blockchain usecase.

## Quick Start

See individual README files in each folder for detailed setup and usage instructions.


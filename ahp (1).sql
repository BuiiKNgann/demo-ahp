-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 15, 2025 at 12:47 PM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ahp`
--

-- --------------------------------------------------------

--
-- Table structure for table `alternatives`
--

CREATE TABLE `alternatives` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `alternatives`
--

INSERT INTO `alternatives` (`id`, `name`) VALUES
(1, 'Khách hàng A'),
(2, 'Khách hàng B'),
(3, 'Khách hàng C'),
(4, 'Khách hàng D');

-- --------------------------------------------------------

--
-- Table structure for table `alternative_scores`
--

CREATE TABLE `alternative_scores` (
  `id` int NOT NULL,
  `expert_id` int NOT NULL,
  `criteria_id` int NOT NULL,
  `alternative_id` int NOT NULL,
  `score` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `alternative_scores`
--

INSERT INTO `alternative_scores` (`id`, `expert_id`, `criteria_id`, `alternative_id`, `score`) VALUES
(173, 1, 1, 1, 0.1219),
(174, 1, 1, 2, 0.2633),
(175, 1, 1, 3, 0.5579),
(176, 1, 1, 4, 0.0569),
(177, 1, 2, 1, 0.2083),
(178, 1, 2, 2, 0.101),
(179, 1, 2, 3, 0.6427),
(180, 1, 2, 4, 0.048),
(181, 1, 3, 1, 0.3639),
(182, 1, 3, 2, 0.0595),
(183, 1, 3, 3, 0.4487),
(184, 1, 3, 4, 0.1279),
(185, 1, 4, 1, 0.3639),
(186, 1, 4, 2, 0.1279),
(187, 1, 4, 3, 0.4487),
(188, 1, 4, 4, 0.0595),
(189, 1, 5, 1, 0.5579),
(190, 1, 5, 2, 0.1219),
(191, 1, 5, 3, 0.2633),
(192, 1, 5, 4, 0.0569),
(193, 1, 6, 1, 0.2633),
(194, 1, 6, 2, 0.1219),
(195, 1, 6, 3, 0.5579),
(196, 1, 6, 4, 0.0569);

-- --------------------------------------------------------

--
-- Table structure for table `criteria`
--

CREATE TABLE `criteria` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `criteria`
--

INSERT INTO `criteria` (`id`, `name`) VALUES
(1, 'Tổng tài sản'),
(2, 'Tỷ lệ vay/tài sản'),
(3, 'Hạng tín dụng'),
(4, 'Lịch sử vỡ nợ'),
(5, 'Độ dài lịch sử tín dụngg'),
(6, 'Quyền sở hữu nhà');

-- --------------------------------------------------------

--
-- Table structure for table `criteria_weights`
--

CREATE TABLE `criteria_weights` (
  `id` int NOT NULL,
  `expert_id` int NOT NULL,
  `criteria_id` int NOT NULL,
  `weight` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `criteria_weights`
--

INSERT INTO `criteria_weights` (`id`, `expert_id`, `criteria_id`, `weight`) VALUES
(79, 1, 1, 0.4193),
(80, 1, 2, 0.1386),
(81, 1, 3, 0.2362),
(82, 1, 4, 0.0338),
(83, 1, 5, 0.0879),
(84, 1, 6, 0.0841);

-- --------------------------------------------------------

--
-- Table structure for table `experts`
--

CREATE TABLE `experts` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `experts`
--

INSERT INTO `experts` (`id`, `name`) VALUES
(1, 'Chuyên gia 1'),
(2, 'Chuyên gia 2'),
(3, 'Chuyên gia 3'),
(4, 'Chuyên gia 4'),
(5, 'Chuyên gia 5');

-- --------------------------------------------------------

--
-- Table structure for table `final_alternative_scores`
--

CREATE TABLE `final_alternative_scores` (
  `id` int NOT NULL,
  `alternative_id` int NOT NULL,
  `final_score` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `final_alternative_scores`
--

INSERT INTO `final_alternative_scores` (`id`, `alternative_id`, `final_score`) VALUES
(9, 1, 0.2494),
(10, 2, 0.1637),
(11, 3, 0.5142),
(12, 4, 0.0725),
(13, 1, 0.2494),
(14, 2, 0.1637),
(15, 3, 0.5142),
(16, 4, 0.0725);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alternatives`
--
ALTER TABLE `alternatives`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `alternative_scores`
--
ALTER TABLE `alternative_scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expert_id` (`expert_id`),
  ADD KEY `criteria_id` (`criteria_id`),
  ADD KEY `alternative_id` (`alternative_id`);

--
-- Indexes for table `criteria`
--
ALTER TABLE `criteria`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `criteria_weights`
--
ALTER TABLE `criteria_weights`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expert_id` (`expert_id`),
  ADD KEY `criteria_id` (`criteria_id`);

--
-- Indexes for table `experts`
--
ALTER TABLE `experts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `final_alternative_scores`
--
ALTER TABLE `final_alternative_scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alternative_id` (`alternative_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alternatives`
--
ALTER TABLE `alternatives`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `alternative_scores`
--
ALTER TABLE `alternative_scores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=197;

--
-- AUTO_INCREMENT for table `criteria`
--
ALTER TABLE `criteria`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `criteria_weights`
--
ALTER TABLE `criteria_weights`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `experts`
--
ALTER TABLE `experts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `final_alternative_scores`
--
ALTER TABLE `final_alternative_scores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `alternative_scores`
--
ALTER TABLE `alternative_scores`
  ADD CONSTRAINT `alternative_scores_ibfk_1` FOREIGN KEY (`expert_id`) REFERENCES `experts` (`id`),
  ADD CONSTRAINT `alternative_scores_ibfk_2` FOREIGN KEY (`criteria_id`) REFERENCES `criteria` (`id`),
  ADD CONSTRAINT `alternative_scores_ibfk_3` FOREIGN KEY (`alternative_id`) REFERENCES `alternatives` (`id`);

--
-- Constraints for table `criteria_weights`
--
ALTER TABLE `criteria_weights`
  ADD CONSTRAINT `criteria_weights_ibfk_1` FOREIGN KEY (`expert_id`) REFERENCES `experts` (`id`),
  ADD CONSTRAINT `criteria_weights_ibfk_2` FOREIGN KEY (`criteria_id`) REFERENCES `criteria` (`id`);

--
-- Constraints for table `final_alternative_scores`
--
ALTER TABLE `final_alternative_scores`
  ADD CONSTRAINT `final_alternative_scores_ibfk_1` FOREIGN KEY (`alternative_id`) REFERENCES `alternatives` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

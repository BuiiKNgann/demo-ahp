-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 12, 2025 at 09:03 AM
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
-- Table structure for table `ahp_final_scores`
--

CREATE TABLE `ahp_final_scores` (
  `id` int NOT NULL,
  `expert_id` int NOT NULL,
  `alternative_id` int NOT NULL,
  `final_score` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ahp_matrices`
--

CREATE TABLE `ahp_matrices` (
  `id` int NOT NULL,
  `expert_id` int NOT NULL,
  `type` enum('criteria','alternative') NOT NULL,
  `criteria_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ahp_matrix_values`
--

CREATE TABLE `ahp_matrix_values` (
  `id` int NOT NULL,
  `matrix_id` int NOT NULL,
  `row_index` int NOT NULL,
  `col_index` int NOT NULL,
  `value` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
(77, 1, 1, 1, 0.1219),
(78, 1, 1, 2, 0.2633),
(79, 1, 1, 3, 0.5579),
(80, 1, 1, 4, 0.0569),
(81, 1, 2, 1, 0.2083),
(82, 1, 2, 2, 0.101),
(83, 1, 2, 3, 0.6427),
(84, 1, 2, 4, 0.048),
(85, 1, 3, 1, 0.3639),
(86, 1, 3, 2, 0.0595),
(87, 1, 3, 3, 0.4487),
(88, 1, 3, 4, 0.1279),
(89, 1, 4, 1, 0.3639),
(90, 1, 4, 2, 0.1279),
(91, 1, 4, 3, 0.4487),
(92, 1, 4, 4, 0.0595),
(93, 1, 5, 1, 0.5579),
(94, 1, 5, 2, 0.1219),
(95, 1, 5, 3, 0.2633),
(96, 1, 5, 4, 0.0569),
(97, 1, 6, 1, 0.2633),
(98, 1, 6, 2, 0.1219),
(99, 1, 6, 3, 0.5579),
(100, 1, 6, 4, 0.0569);

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
(55, 1, 1, 0.4193),
(56, 1, 2, 0.1386),
(57, 1, 3, 0.2362),
(58, 1, 4, 0.0338),
(59, 1, 5, 0.0879),
(60, 1, 6, 0.0841);

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

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ahp_final_scores`
--
ALTER TABLE `ahp_final_scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expert_id` (`expert_id`),
  ADD KEY `alternative_id` (`alternative_id`);

--
-- Indexes for table `ahp_matrices`
--
ALTER TABLE `ahp_matrices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expert_id` (`expert_id`),
  ADD KEY `criteria_id` (`criteria_id`);

--
-- Indexes for table `ahp_matrix_values`
--
ALTER TABLE `ahp_matrix_values`
  ADD PRIMARY KEY (`id`),
  ADD KEY `matrix_id` (`matrix_id`);

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
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ahp_final_scores`
--
ALTER TABLE `ahp_final_scores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `ahp_matrices`
--
ALTER TABLE `ahp_matrices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ahp_matrix_values`
--
ALTER TABLE `ahp_matrix_values`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `alternatives`
--
ALTER TABLE `alternatives`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `alternative_scores`
--
ALTER TABLE `alternative_scores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- AUTO_INCREMENT for table `criteria`
--
ALTER TABLE `criteria`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `criteria_weights`
--
ALTER TABLE `criteria_weights`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `experts`
--
ALTER TABLE `experts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ahp_final_scores`
--
ALTER TABLE `ahp_final_scores`
  ADD CONSTRAINT `ahp_final_scores_ibfk_1` FOREIGN KEY (`expert_id`) REFERENCES `experts` (`id`),
  ADD CONSTRAINT `ahp_final_scores_ibfk_2` FOREIGN KEY (`alternative_id`) REFERENCES `alternatives` (`id`);

--
-- Constraints for table `ahp_matrices`
--
ALTER TABLE `ahp_matrices`
  ADD CONSTRAINT `ahp_matrices_ibfk_1` FOREIGN KEY (`expert_id`) REFERENCES `experts` (`id`),
  ADD CONSTRAINT `ahp_matrices_ibfk_2` FOREIGN KEY (`criteria_id`) REFERENCES `criteria` (`id`);

--
-- Constraints for table `ahp_matrix_values`
--
ALTER TABLE `ahp_matrix_values`
  ADD CONSTRAINT `ahp_matrix_values_ibfk_1` FOREIGN KEY (`matrix_id`) REFERENCES `ahp_matrices` (`id`) ON DELETE CASCADE;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
-- Xóa bảng nếu đã tồn tại
DROP TABLE IF EXISTS `ahp_final_scores`;

-- Tạo lại bảng
CREATE TABLE `ahp_final_scores` (
  `id` int NOT NULL,
  `expert_id` int NOT NULL,
  `alternative_id` int NOT NULL,
  `final_score` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

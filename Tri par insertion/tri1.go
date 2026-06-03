package main

import "fmt"

func InsertionSort(arr []int) {
	n := len(arr)

	for i := 1; i < n; i++ {
		key := arr[i]
		j := i - 1

		// Déplace les éléments de arr[0..i-1] qui sont plus grands que la clé
		// d'une position vers la droite
		for j >= 0 && arr[j] > key {
			arr[j+1] = arr[j]
			j--
		}

		// Place la clé à sa bonne position
		arr[j+1] = key
	}
}

func main() {
	arr := []int{12, 11, 13, 5, 6}
	fmt.Println("Tableau non trié:", arr)
	InsertionSort(arr)
	fmt.Println("Tableau trié:", arr)
}
